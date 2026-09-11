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
