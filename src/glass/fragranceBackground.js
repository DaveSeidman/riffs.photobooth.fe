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
  vec3 galaxy(vec2 p, vec2 center, float radius, float tilt, float spin) {
    vec2 q=(p-center)/radius;
    float c=cos(tilt), s=sin(tilt);
    q=mat2(c,-s,s,c)*q;
    q.y*=1.65;
    float r=length(q);
    float angle=atan(q.y,q.x);
    // Integer arm count keeps the angular seam continuous as the galaxy turns.
    float arms=.5+.5*cos(angle*3.-r*8.+time*spin);
    float disk=exp(-r*r*1.8);
    float structure=noise(q*9.+vec2(time*.025,-time*.018));
    float lanes=pow(arms,3.)*disk*smoothstep(.08,.4,r);
    vec3 color=vec3(.12,.16,.42)*disk*.3;
    color+=mix(vec3(.24,.10,.52),vec3(.35,.64,1.),structure)*lanes*.85;
    color+=vec3(1.,.79,.64)*exp(-r*r*65.)*.85;
    color+=vec3(.73,.78,1.)*pow(structure,9.)*disk*.5;
    return color;
  }
  vec3 pulse(vec2 p) {
    // Independent flow speeds give the clouds and star planes visible depth.
    vec2 drift=vec2(time*.014,-time*.009);
    float gas=clouds(p*2.2+drift);
    float blueCloud=clouds(p*3.+vec2(4.,1.)-drift*.75);
    vec2 warp=vec2(gas-.45,blueCloud-.45);
    vec2 detailUv=p+warp*.48+drift*.6;
    float filaments=noise(detailUv*23.);
    float dust=noise(detailUv*67.);
    float band=exp(-pow(p.x*.7+p.y*.5+warp.x*.8,2.)*5.);
    float lower=1.-smoothstep(-.65,.65,p.y);
    vec3 color=mix(vec3(.028,.002,.055),vec3(.004,.012,.045),lower);
    float nebula=smoothstep(.25,.72,gas*.6+filaments*.27+dust*.13);
    color+=mix(vec3(.32,.012,.29),vec3(.025,.16,.32),lower)*nebula*(.35+.65*band);
    float wisps=pow(clamp(blueCloud*1.35,0.,1.),3.);
    color+=vec3(.12,.055,.28)*wisps*(.4+filaments);
    color+=vec3(.035,.12,.21)*smoothstep(.48,.8,gas+warp.y*.3)*band;
    color*=.82+.3*filaments;
    // Offset galaxies stay visible around the portrait rather than behind its center.
    color+=galaxy(p,vec2(-.38+.035*sin(time*.09),.58),.39,-.55,.18);
    color+=galaxy(p,vec2(.40,-.52+.025*cos(time*.08)),.25,.7,-.13)*.72;
    float farStars=stars(p+drift*.20,43.,8.)*.5;
    float midStars=stars(p+drift*.55,25.,1.)*.85;
    float nearStars=stars(p+drift,12.,17.)*1.15;
    float distant=pow(dust,12.)*.18;
    return color+vec3(.78,.85,1.)*(farStars+midStars+nearStars+distant);
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
