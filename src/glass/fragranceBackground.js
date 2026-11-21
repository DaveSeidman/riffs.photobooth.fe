import { maskContourGLSL } from "./maskContour.js";
// Procedural artwork: no videos, image downloads, or frame-by-frame textures.
export const fragranceBackgroundVertex = `
  varying vec2 vUv;
  void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`;
export const fragranceBackgroundFragment = `
  uniform sampler2D video;
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
  uniform vec2 maskTexel;
  uniform vec2 screenTexel;
  uniform float imageAspect;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
  }
  float clouds(vec2 p) {
    float n=0.; float a=.5;
    for(int i=0;i<4;i++) { n+=a*noise(p); p=mat2(.8,-.6,.6,.8)*p*2.03+3.7; a*=.5; }
    return n;
  }
  float stars(vec2 p,float scale,float seed);
  float blushDust(vec2 p,float scale,float seed);
  vec3 blush(vec2 p) {
    float t=time*.055;
    vec2 flow=vec2(clouds(p*1.5+vec2(t,0.)),clouds(p*1.5+vec2(4.2,-t*.7)));
    vec2 q=p*2.5+flow*2.;
    float curl=clouds(q+vec2(sin(p.y*2.+t),cos(p.x*2.-t))*.6);
    // Fine, advected mottling breaks the broad swirls into cloudy rose marble.
    // Fixed spatial noise moves with the flow instead of flickering each frame.
    vec2 detailUv=p+flow*.22+vec2(t*.08,-t*.04);
    float medium=noise(detailUv*19.+curl*2.);
    float fine=noise(detailUv*53.+medium*.7);
    float grain=noise(detailUv*127.);
    float folds=.5+.5*sin(q.x*3.+q.y*2.+curl*9.-t);
    float marble=smoothstep(.22,.79,curl*.48+medium*.30+fine*.15+folds*.07);
    vec3 color=mix(vec3(.38,.008,.095),vec3(.92,.075,.34),marble);
    float wisps=smoothstep(.48,.82,medium*.55+fine*.25+curl*.20);
    color=mix(color,vec3(1.,.57,.69),wisps*.62);
    color+=vec3(.07,.035,.04)*(grain-.5);
    color*=.88+.24*fine;
    // Two slow, curved streams of pearl-pink dust ride the swirling field.
    float angle=time*.045+length(p)*.5;
    mat2 orbit=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
    vec2 dust=orbit*p+flow*.18;
    float particles=blushDust(dust,19.,12.)+blushDust(dust*.85+vec2(2.,time*.009),31.,29.)*.6;
    return color+vec3(1.,.92,.98)*particles*.95;
  }
  float stars(vec2 p,float scale,float seed) {
    vec2 grid=p*scale; vec2 cell=floor(grid); vec2 f=fract(grid)-.5;
    vec2 offset=vec2(hash(cell+seed),hash(cell+seed+8.))-.5;
    vec2 d=f-offset*.65;
    float h=hash(cell+seed+22.);
    float point=exp(-dot(d,d)*1700.);
    float rays=exp(-abs(d.x)*270.-abs(d.y)*35.)+exp(-abs(d.y)*270.-abs(d.x)*35.);
    float shimmer=.75+.25*sin(time*.55+h*42.);
    return step(.94,h)*(point+rays*.14)*shimmer;
  }
  float blushDust(vec2 p,float scale,float seed) {
    vec2 grid=p*scale, cell=floor(grid), f=fract(grid)-.5;
    vec2 offset=vec2(hash(cell+seed),hash(cell+seed+8.))-.5;
    vec2 d=f-offset*.65;
    float h=hash(cell+seed+22.);
    // Broad pearly motes, about 2.5 times the diameter of Pulse's pinprick stars.
    float core=exp(-dot(d,d)*260.);
    float halo=exp(-dot(d,d)*70.)*.22;
    return step(.94,h)*(core+halo)*(.8+.2*sin(time*.55+h*42.));
  }
  vec3 pulse(vec2 p) {
    vec2 drift=vec2(time*.003,-time*.002);
    float gas=clouds(p*2.2+drift);
    float band=exp(-pow((p.x*.65+p.y*.5+sin(p.y*2.)*.18),2.)*6.);
    // Plum nebula above, dusty cobalt below, with fine interstellar structure.
    float blueCloud=clouds(p*3.+4.-drift);
    vec2 detailUv=p+vec2(gas,blueCloud)*.15+drift;
    float filaments=noise(detailUv*23.);
    float dust=noise(detailUv*67.);
    float lower=1.-smoothstep(-.65,.65,p.y);
    vec3 color=mix(vec3(.075,.003,.085),vec3(.009,.024,.075),lower);
    float nebula=smoothstep(.22,.76,gas*.65+filaments*.25+dust*.10);
    color+=mix(vec3(.24,.008,.19),vec3(.025,.095,.19),lower)*nebula*(.4+.6*band);
    color+=vec3(.04,.055,.105)*blueCloud*(.5+filaments);
    color*=.78+.35*filaments+.12*dust;
    float sparkle=stars(p+drift,20.,1.)+stars(p-drift*.5,37.,8.)*.55;
    float distant=pow(dust,12.)*.18;
    return color+vec3(.78,.70,1.)*(sparkle+distant);
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
      float artworkAlpha=(1.-windowMask)*clamp(backgroundOpacity,0.,1.);
      gl_FragColor=vec4(mix(cameraColor,artwork,artworkAlpha),1.);
    }
    #include <colorspace_fragment>
  }
`;
