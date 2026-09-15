# color-init-fix v3

## 症状

登录后任务栏 / 开始菜单的 AeroGlass 着色不对（发白或颜色陈旧）；
打开 系统设置 → 桌面特效 → AeroGlass 相关设置后立即恢复正常。

## 根因

KCM（设置界面）和特效之间通过 System-V 共享内存段 `kwinaero` 传递
HSV 颜色：KCM 写入后通过 D-Bus 触发 `reconfigureEffect`。但共享内存
段在进程退出后依然存在（直到重启才回收）。旧逻辑在 `reconfigure()`
里只要能 attach 到段就把其中的 HSV 当作有效值，导致：

1. 上一次会话 KCM 留下的陈旧颜色（甚至是预览后取消的颜色，
   `skip=true`）在 kwin 启动时覆盖 kwinrc 里的正确值；
2. 颜色 uniform 是全局的，一旦被污染，着色就一直错误；
3. 打开设置页时 KCM 构造函数会重新读取 Plasma accent 颜色、写入
   共享内存并触发 D-Bus 重配 —— 这就是"点开设置就恢复"的原因。

## 修复（v3）

- `readMemory()` 改为无副作用：不再直接写成员变量，结果填入
  `SharedColorState`；KCM 写入时追加毫秒时间戳，特效只信任 30 秒
  内写入的段（`s_sharedColorFreshnessMs`）。启动时一律以 kwinrc
  为准，陈旧段 / 无时间戳的旧格式段全部忽略。
- `reconfigure()` 按新鲜度分派：新鲜的 `skip=true` 段才进入
  "KCM 预览"分支；新鲜的非 skip 段（保存/打开设置触发）使用共享
  HSV；其余情况全部走 kwinrc。
- accent 跟随逻辑收敛到 `updateAccentFromPlasma()`，消除 v2 中
  两处重复代码。
- 新增 `KConfigWatcher` 监听 kdeglobals：accent 变化后 ~300ms
  （去抖）自动重新着色，不再依赖打开设置页或 2 秒轮询。
- 启动自愈：登录后 3/8/15/25/40 秒各重试一次 accent 读取，
  防止会话启动早期 kdeglobals 尚未写好导致跟丢；成功一次后
  自动失效（`m_accentAppliedOnce`）。

## 兼容性

- 共享内存格式向后兼容：旧特效读前 6 个字段、忽略时间戳；
  新特效遇到无时间戳的段按"陈旧"处理，回退 kwinrc。
- 特效与 KCM 必须成对升级（同一软件包内）。

## 涉及文件

- `effects_cpp/kde-effects-aeroglassblur/src/blur.h`
- `effects_cpp/kde-effects-aeroglassblur/src/blur.cpp`
- `effects_cpp/kde-effects-aeroglassblur/src/kcm/blur_config.cpp`
- `aeroshell-kwin-components.spec`（Release 2 + changelog）

---

# color-init-fix v4（暗色模式切换后着色丢失）

## 症状

切换到暗色模式（Plasma 颜色方案）后，任务栏 / 开始菜单 / 标题栏的
AeroGlass 着色消失（灰黑、不着色）；打开 系统设置 → 桌面特效 →
AeroGlass 设置后立刻恢复，亮色模式下则一直正常。

## 根因（v3 遗留）

v3 之后"打开设置即恢复"的机制仍然依赖 KCM 写入共享内存 + D-Bus 重配。
特效侧的自动路径存在两个缺口：

1. **共享内存段仍可污染"跟随 accent"状态**：`reconfigure()` 先读共享
   段、后读配置。当"跟随 Plasma accent 颜色"开启时，只要段是新鲜的
   （30 秒内），哪怕它是颜色混合器遗留的 `skip=true` 预览段，也会把
   预览的 intensity / transparency 等成员写进特效；随后的
   `updateAccentFromPlasma()` 只覆盖 HSV，不恢复 intensity。结果颜色
   HSV 正确但强度/透明度被预览值污染 → 着色不可见，且 2 秒轮询只看
   HSV（相同就跳过），永远不会自愈。
2. **2 秒轮询不是自愈**：`slotPlasmaAccentColorChanged()` 在 accent
   值与 `m_lastPlasmaAccentColor` 相同时直接返回。一旦某次状态被污染
   （或 kdeglobals 在切换过程中被读到中间态），只要 accent 值不再
   变化，轮询就永远不再重绘/重算，着色一直错误，直到打开设置触发
   完整 `reconfigure()`。

## 修复（v4，仅改特效侧）

- **跟随 accent 时完全忽略共享内存段**：`reconfigure()` 先读配置
  得到 `FollowPlasmaAccentColor`，为真时 `useSharedColor` 恒为
  `false`——颜色一律以实时读取的 Plasma accent 为准，KCM 预览段
  （无论 skip 与否）都无法再污染 intensity / transparency。关闭跟随
  时行为不变（预览、保存照常走共享内存）。
- **2 秒轮询升级为自愈**：每次 tick（以及 kdeglobals 监听去抖）都会
  从 kwinrc 重新读取 `AeroIntensity` / `EnableTransparency`，与成员
  比对；不一致则恢复并重新计算颜色、请求全屏重绘；accent 有变化时
  照常重新应用。等价于"每 2 秒自动执行一次打开设置页的恢复动作"。
- `updateAccentFromPlasma()` 应用 accent 后主动 `addRepaintFull()`，
  保证任何调用方都会把新颜色画到屏幕上。

## 兼容性

- 共享内存格式不变（仍带时间戳），特效与 KCM 无需同时升级；
  旧 KCM 写入的 6 字段段在"跟随 accent"开启时同样被忽略，行为安全。
- 关闭"跟随 Plasma accent 颜色"的用户走原逻辑，预览与保存功能不受影响。

## 涉及文件（v4）

- `effects_cpp/kde-effects-aeroglassblur/src/blur.cpp`
- `COLOR-INIT-FIX-v3.md`（本文档）
- `aeroshell-kwin-components.spec`（Release 3 + changelog）

