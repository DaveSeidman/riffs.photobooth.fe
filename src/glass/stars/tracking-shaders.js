// Ported from lunar-tracking/src/experience/Starfield.jsx.
// Booth does not use skeleton attraction or moon/bottle occlusion in the sky pass.
const MAX_SEGMENTS = 1;
export const starVertex = `
  attribute vec3 aSeed;
  attribute vec3 aOrbit;
  uniform float uSkyAngle, uStrength, uRadius;
  uniform vec2 uWall,uSkyPole,uSkyOffset;
  uniform float uSkyTile;
  uniform float uOrbitDepth;
  uniform int uCount;
  uniform vec4 uA[${MAX_SEGMENTS}], uB[${MAX_SEGMENTS}];
  varying float vEnergy, vSeed, vDepth, vAngle, vAcross;
  varying vec2 vWall;
  varying float vOrbit;
  void main() {
    // One rigid rotation, in physical wall units: no per-star drift or brightness pulse.
    float angle = uSkyAngle;
    vec2 pole = uSkyPole;
    float coverage = length(uWall*.5+abs(pole))+.4;
    vec2 p = position.xy * coverage + pole;
    vAcross = clamp(p.x / uWall.x + .5, 0., 1.);
    float c=cos(angle),s=sin(angle);
    p = mat2(c,s,-s,c)*(p-pole)+pole;
    p += uSkyOffset;
    p = mod(p+uSkyTile*.5,uSkyTile)-uSkyTile*.5;
    vec2 delta = vec2(0.);
    float energy = 0.;
    for (int i=0; i<${MAX_SEGMENTS}; i++) {
      if (i >= uCount) break;
      vec2 a = uA[i].xy, b = uB[i].xy, ab = b-a;
      float h = clamp(dot(p-a,ab)/max(dot(ab,ab),.00001),0.,1.);
      vec2 d = p - (a + ab*h);
      float dist = length(d);
      float close = mix(uA[i].w,uB[i].w,h);
      float radius = uRadius * (.65 + close*.65);
      float influence = exp(-dist*dist/(radius*radius)) * close;
      // Nearest influential limb wins: adding every bone overweights the torso.
      if (influence > energy) {
        energy = influence;
        vec2 n = d/max(dist,.025);
        vec2 tangent = vec2(-n.y,n.x);
        delta = (n*.42 + tangent*.24) * influence;
      }
    }
    p += delta * uStrength * (.7 + aSeed.z*.5);
    vOrbit=smoothstep(0.,1.,aOrbit.z);
    p=mix(p,aOrbit.xy,vOrbit);
    energy*=1.-vOrbit*.8;
    vWall=p;
    vEnergy = energy * min(uStrength,1.5); vSeed = aSeed.x; vDepth = aSeed.z;
    vAngle = atan(delta.y+.001,delta.x+.001);
    gl_Position = vec4(p / (uWall*.5), mix(.999,uOrbitDepth,vOrbit), 1.);
    float bokeh = step(.975,aSeed.y)*2.8;
    gl_PointSize = 1.5 + pow(aSeed.x,6.)*4.5 + bokeh + energy*3.8;
  }
`;
export const starFragment = `
  uniform vec3 uCold, uMid, uHot;
  uniform float uExposure;
  uniform vec4 uMoon,uBottles[2];
  varying float vEnergy, vSeed, vDepth, vAngle, vAcross;
  varying vec2 vWall;
  varying float vOrbit;
  void main() {
    vec2 uv = gl_PointCoord - .5;
    float c=cos(vAngle), s=sin(vAngle);
    uv = mat2(c,-s,s,c)*uv;
    uv.y *= 1. + vEnergy*1.5;
    float r = length(uv)*2.;
    if (r>1.) discard;
    float core = exp(-r*r*24.);
    float halo = exp(-r*r*5.)*.22;
    float light = (core+halo) * (.3+pow(vSeed,3.)*1.6) * (.45+vDepth*.55);
    vec3 base = mix(uCold,uMid,smoothstep(.05,.6,vAcross));
    base = mix(base,uHot,smoothstep(.45,1.,vAcross));
    vec3 energized = mix(uMid,uHot,smoothstep(.15,.85,vAcross));
    vec3 color = mix(base,energized,smoothstep(.1,.8,vEnergy)*.75);
    color = mix(color,vec3(.88,.84,1.),pow(vSeed,12.)*.4);
    float mask=1.;
    if(uMoon.z>0.)mask=smoothstep(.99,1.035,length((vWall-uMoon.xy)/uMoon.zw));
    mask=mix(mask,1.,vOrbit);
    for(int i=0;i<2;i++)if(uBottles[i].z>0.){vec2 q=(vWall-uBottles[i].xy)/uBottles[i].zw;mask*=1.-exp(-dot(q,q)*2.);}
    gl_FragColor = vec4(color * light * (1.+vEnergy*1.7) * uExposure * mask,1.);
  }
`;


export const atmosphereFragment = `
        uniform vec3 uCold,uMid,uHot;
        uniform float uSkyAngle;
        uniform vec2 uWall,uSkyPole,uSkyOffset;
        uniform float uSkyTile;
        uniform sampler2D uNoise;
        uniform float uNebula;
        varying vec2 vUv;
        vec2 gasNoise(vec2 p){
          vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return texture2D(uNoise,(i+f+.5)/256.).rg;
        }
        float gasFbm(vec2 p){
          float sum=0.,weight=.53;
          mat2 turn=mat2(.8,.6,-.6,.8);
          for(int i=0;i<6;i++){sum+=gasNoise(p).r*weight;p=turn*p*2.03+vec2(17.3,9.2);weight*=.5;}
          return sum;
        }
        void main(){
          float c=cos(uSkyAngle),s=sin(uSkyAngle);
          vec2 q=mod((vUv-.5)*uWall-uSkyOffset+uSkyTile*.5,uSkyTile)-uSkyTile*.5-uSkyPole;
          vec2 sky=mat2(c,-s,s,c)*q+uSkyPole;
          vec2 p=sky/uWall+.5;
          float blue=exp(-dot((p-vec2(.12,.55))*vec2(1.5,1.1),(p-vec2(.12,.55))*vec2(1.5,1.1))*3.);
          float rose=exp(-dot((p-vec2(.95,.4))*vec2(1.8,1.2),(p-vec2(.95,.4))*vec2(1.8,1.2))*3.);
          float ribbon=exp(-pow((p.y-.46-sin(p.x*7.)*.18)*5.,2.));
          vec3 haze=(uCold*blue+uHot*rose)*.009+uMid*ribbon*.005;
          // All gas structure is stationary in sky coordinates. Only the shared sky
          // rotation and drift move it; there is no independent boiling or pulsing.
          vec2 n=sky*1.65+vec2(27.4,13.8);
          vec2 warp=(gasNoise(n*.65)-.5)*2.4;
          warp+=(gasNoise(n*1.2+warp+12.)-.5)*.9;
          float billows=gasFbm(n*1.9+warp);
          float dust=gasFbm(n*4.1+warp*1.5+31.);
          float fine=gasFbm(n*10.7-warp*1.8+57.);
          float ridges=pow(1.-abs(fine*2.-1.),3.);
          float axis=sky.y-.08-sin(sky.x*.67)*.28-(warp.y*.24);
          float envelope=exp(-axis*axis*1.6);
          float density=smoothstep(.37,.73,billows)*envelope;
          float darkLanes=smoothstep(.43,.64,dust+(fine-.5)*.22);
          float gas=pow(density,2.1)*(.24+ridges*.92)*(1.-darkLanes*.9);
          vec3 whiteGas=mix(vec3(.82,.86,.96),mix(uCold,uHot,clamp(p.x,0.,1.)),.14);
          vec3 nebula=whiteGas*gas*uNebula*.065;
          gl_FragColor=vec4(vec3(.0004,.0007,.002)+haze+nebula,1.);
        }`;
