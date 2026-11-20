// Shared circular dilation keeps the neon and background cutout aligned.
// Dense angular sampling avoids the corners of the previous eight-point kernel.
export const maskContourGLSL = `
  float expandMask(vec2 uv, vec2 radius) {
    float value=texture2D(mask,uv).r;
    for(int i=0;i<24;i++) {
      float angle=float(i)*6.28318530718/24.;
      value=max(value,texture2D(mask,uv+vec2(cos(angle),sin(angle))*radius).r);
    }
    return value;
  }
`;
