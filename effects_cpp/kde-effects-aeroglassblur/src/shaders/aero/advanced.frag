uniform sampler2D texUnit;
uniform float offset;
uniform vec2 halfpixel;

uniform float aeroColorR;
uniform float aeroColorG;
uniform float aeroColorB;
uniform float aeroColorA;
uniform float aeroColorBalance;
uniform float aeroAfterglowBalance;
uniform float aeroBlurBalance;

uniform mat4 colorMatrix;

// SDF corner clipping — per-corner radii (x=TL, y=TR, z=BL, w=BR)
uniform vec2 u_blurRectSize;
uniform vec4 u_cornerRadius;
uniform float u_opacity;

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

void main(void)
{
    vec4 sum = texture(texUnit, uv + vec2(-halfpixel.x * 2.0, 0.0) * offset);
    sum += texture(texUnit, uv + vec2(-halfpixel.x, halfpixel.y) * offset) * 2.0;
    sum += texture(texUnit, uv + vec2(0.0, halfpixel.y * 2.0) * offset);
    sum += texture(texUnit, uv + vec2(halfpixel.x, halfpixel.y) * offset) * 2.0;
    sum += texture(texUnit, uv + vec2(halfpixel.x * 2.0, 0.0) * offset);
    sum += texture(texUnit, uv + vec2(halfpixel.x, -halfpixel.y) * offset) * 2.0;
    sum += texture(texUnit, uv + vec2(0.0, -halfpixel.y * 2.0) * offset);
    sum += texture(texUnit, uv + vec2(-halfpixel.x, -halfpixel.y) * offset) * 2.0;

    sum /= 12.0;
    vec4 color = vec4(aeroColorR, aeroColorG, aeroColorB, aeroColorA);
    color *= colorMatrix;
    vec3 primaryColor   = color.rgb;
    vec3 secondaryColor = color.rgb;
    vec3 primaryLayer   = primaryColor * aeroColorBalance;
    vec3 secondaryLayer = (secondaryColor * dot(sum.xyz, vec3(0.299, 0.587, 0.114))) * aeroAfterglowBalance;
    vec3 blurLayer      = sum.xyz * aeroBlurBalance;

    fragColor = vec4(primaryLayer + secondaryLayer + blurLayer, 1.0);

    // SDF corner clipping with anti-aliasing (per-corner).  When all radii
    // are 0 (maximized windows, docks) the guard skips clipping entirely.
    float sdfAlpha = 1.0;
    if (any(greaterThan(u_cornerRadius, vec4(0.5)))) {
        vec2  center   = u_blurRectSize * 0.5;
        vec2  halfSize = u_blurRectSize * 0.5;
        float d        = sdRoundedBox(vertex, center, halfSize, u_cornerRadius);
        float w        = fwidth(d);
        sdfAlpha       = 1.0 - clamp(0.5 + d / max(w, 0.001), 0.0, 1.0);
    }
    // u_opacity replaces the former GL_CONSTANT_ALPHA modulation blending;
    // multiplying both RGB and A yields premultiplied alpha, which works
    // correctly with GL_ONE / GL_ONE_MINUS_SRC_ALPHA.
    fragColor *= u_opacity * sdfAlpha;
}
