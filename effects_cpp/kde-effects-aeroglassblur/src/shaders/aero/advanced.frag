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

// SDF corner clipping
uniform vec2 u_blurRectSize;
uniform float u_cornerRadius;
uniform float u_opacity;

in vec2 uv;
in vec2 vertex;
out vec4 fragColor;

float sdRoundedBox(vec2 p, vec2 center, vec2 halfSize, float r)
{
    vec2 q = abs(p - center) - halfSize + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
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

    // SDF corner clipping with anti-aliasing.  When u_cornerRadius is 0
    // (maximized windows, docks) the guard skips clipping entirely.
    float sdfAlpha = 1.0;
    if (u_cornerRadius > 0.5) {
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
