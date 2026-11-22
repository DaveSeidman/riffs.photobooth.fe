import { maskContourGLSL } from "./maskContour.js";
// Procedural artwork: no videos, image downloads, or frame-by-frame textures.
export const fragranceBackgroundVertex = `
  varying vec2 vUv;
  void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`;
export const fragranceBackgroundFragment = `
  uniform sampler2D video;
  uniform sampler2D pulseSky;
  uniform float skyReady;
  uniform vec2 skyUvScale;
  uniform sampler2D blushFluid;
  uniform float fluidReady;
  uniform sampler2D mask;
  uniform float maskReady;
  uniform float time;
  uniform float pulseMix;
  uniform float threshold;
  uniform float softness;
  uniform float outlineExtent;
  uniform float outlineOffset;
  uniform float clearGap;
  uniform float backgroundOpacity;
  uniform float pulseBackgroundOpacity;
  uniform vec2 maskTexel;
  uniform vec2 screenTexel;
  uniform float imageAspect;
  varying vec2 vUv;
  vec3 blush(vec2 p) {
    if (fluidReady > .5) return texture2D(blushFluid,vUv).rgb;
    return vec3(.45,.16,.32);
  }
  vec3 pulse(vec2 p) {
    if (skyReady > .5) return texture2D(pulseSky,(vUv-.5)*skyUvScale+.5).rgb;
    return vec3(.001,.0015,.004);
  }
  ${maskContourGLSL}
  void main() {
    vec3 cameraColor=sRGBTransferEOTF(texture2D(video,vUv)).rgb;
    if(maskReady<.5) { gl_FragColor=vec4(cameraColor,1.); }
    else {
      vec2 uv=vec2(vUv.x,1.-vUv.y);
      // The transparent gap reveals the live camera underneath during development.
      // It begins beyond the neon halo, not beneath the glowing tube.
      vec2 radius=maskTexel*outlineExtent+screenTexel*(outlineOffset+clearGap);
      float windowMask=smoothstep(threshold-softness,threshold+softness,expandMask(uv,radius));
      vec2 p=(vUv-.5)*vec2(imageAspect,1.)*2.;
      // Evaluate both worlds only during the transition.
      vec3 artwork;
      if (windowMask > .999) artwork=cameraColor;
      else if (pulseMix < .001) artwork=blush(p);
      else if (pulseMix > .999) artwork=pulse(p);
      else artwork=mix(blush(p),pulse(p),pulseMix);
      float artworkAlpha=(1.-windowMask)*mix(backgroundOpacity,pulseBackgroundOpacity,pulseMix);
      gl_FragColor=vec4(mix(cameraColor,artwork,artworkAlpha),1.);
    }
    #include <colorspace_fragment>
  }
`;
