uniform sampler2D texUnit;
uniform float opacity;
uniform float translate;
uniform vec2 screenResolution;
uniform vec2 windowSize;
uniform mat4 colorMatrix;
uniform vec2 windowPos;

// Glow
uniform vec2 textureSize;
uniform bool scaleY;
uniform sampler2D glowTexture;
uniform bool glowEnable;
uniform float glowOpacity;
uniform float windowScale;

// SDF corner clipping — per-corner radii (x=TL, y=TR, z=BL, w=BR)
uniform vec2 u_blurRectSize;
uniform vec4 u_cornerRadius;

in vec2 uv;
in vec2 vertex;
out vec4 fragColor;

// Per-corner SDF: selects the appropriate corner radius based on fragment
// position relative to the box centre.  Matches KWin's sdfRoundedBox().
float sdRoundedBox(vec2 p, vec2 center, vec2 halfSize, vec4 r)
{
    vec2 rp = p - center;
    float radius = rp.x > 0.0
        ? (rp.y < 0.0 ? r.y : r.w)   // right: top / bottom
        : (rp.y < 0.0 ? r.x : r.z);  // left:  top / bottom
    vec2 q = abs(rp) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

vec4 glowFragment()
{
    float xpos = clamp(uv.x, 0.0, 1.0);

    float t_x = uv.x;
    if(xpos > 0.5) t_x = 1.0 - uv.x;
    else t_x = uv.x;

    float t_y = uv.y;
    if(scaleY) t_y = uv.y * windowSize.y;
    else t_y = uv.y;
    vec2 t_uv = vec2(windowSize.x * t_x / max(textureSize.x, 1.0),
                     windowSize.y * (1.0 - t_y) / max(textureSize.y, 1.0));

    vec4 result = texture(glowTexture, clamp(t_uv, vec2(0.0), vec2(1.0))) * glowOpacity;
    return result;
}

vec2 reflectionTextureCoordinates()
{
    float middleLine = windowPos.x + (windowSize.x * windowScale) / 2.0;
    float middleScreenLine = screenResolution.x / 2.0;
    float dx = translate * (middleScreenLine - middleLine) / 10.0;

    vec2 windowPixelSize = windowSize * windowScale;
    float x = (windowPos.x + uv.x * windowPixelSize.x + dx) / max(screenResolution.x, 1.0);

    // Map y to screen space, consistent with the x coordinate.
    //
    // The previous mapping "y = 1.0 - uv.y" compressed the entire reflection
    // texture into the window's blur height.  For short windows like docks /
    // panels (taskbars), which may be only ~40 px tall, this extreme vertical
    // compression produced visible banding and hot-spots in the reflection
    // that aligned with UI elements (search box, clock area, etc.), making the
    // frosted-glass reflection look abnormal.
    //
    // The VBO V coordinate is "v = 1.0 - device_y / scaledBgRect.height()",
    // so "(1.0 - uv.y) * windowPixelSize.y" recovers the device-pixel offset
    // from the top of the blur rect.  Adding windowPos.y gives the absolute
    // screen-space Y; dividing by screenResolution.y yields a [0,1] coordinate
    // that is consistent with how x is already mapped.
    //
    // With this change, a dock at the bottom of the screen samples only the
    // bottom sliver of the reflection texture (the darkest part), producing a
    // subtle, natural sheen instead of an over-compressed band.
    float y = (windowPos.y + (1.0 - uv.y) * windowPixelSize.y) / max(screenResolution.y, 1.0);

    return clamp(vec2(x, y), vec2(0.0), vec2(1.0));
}

void main(void)
{
    vec2 reflectionUv = reflectionTextureCoordinates();

    vec4 result = texture(texUnit, reflectionUv) * opacity;
    if (glowEnable) {
        result += glowFragment();
    }

    fragColor = result;
    fragColor *= colorMatrix;

    // SDF corner clipping with anti-aliasing (per-corner).  Ensures the
    // reflection and glow texture do not bleed past the window's rounded
    // visual corners.
    float sdfAlpha = 1.0;
    if (any(greaterThan(u_cornerRadius, vec4(0.5)))) {
        vec2  center   = u_blurRectSize * 0.5;
        vec2  halfSize = u_blurRectSize * 0.5;
        float d        = sdRoundedBox(vertex, center, halfSize, u_cornerRadius);
        float w        = fwidth(d);
        sdfAlpha       = 1.0 - clamp(0.5 + d / max(w, 0.001), 0.0, 1.0);
    }
    fragColor *= sdfAlpha;
}
