import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Vector3, Vector4 } from "three";
import { maskContourGLSL } from "./maskContour.js";
import { fragranceBackgroundVertex, fragranceBackgroundFragment } from "./fragranceBackground.js";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const fragmentShader = `
  uniform sampler2D video;
  uniform sampler2D mask;
  uniform vec3 lightPosition;
  uniform vec3 lightColor;
  uniform float strength;
  uniform float ambient;
  uniform float reach;
  uniform float rimStrength;
  uniform float rimWidth;
  uniform vec2 maskTexel;
  uniform float threshold;
  uniform float softness;
  uniform float mirrorSign;
  uniform float showMask;
  uniform float objectMaskPass;
  uniform vec3 outlineColor;
  uniform float outlineStrength;
  uniform float outlineWidth;
  uniform float outlineOffset;
  uniform vec2 screenTexel;
  uniform int headCount;
  uniform vec4 heads[4];
  varying vec2 vUv;
  varying vec3 vWorld;
  ${maskContourGLSL}
  void main() {
    vec2 maskUv = vec2(vUv.x, 1.0-vUv.y);
    float confidence = texture2D(mask, maskUv).r;
    float alpha = smoothstep(threshold-softness, threshold+softness, confidence);
    vec2 offsetRadius=screenTexel*outlineOffset;
    float inner = smoothstep(threshold-softness, threshold+softness, expandMask(maskUv,offsetRadius));
    float outer = smoothstep(threshold-softness, threshold+softness, expandMask(maskUv,offsetRadius+maskTexel*outlineWidth));
    float halo = smoothstep(threshold-softness*.75, threshold+softness*.75, expandMask(maskUv,offsetRadius+maskTexel*outlineWidth*1.6));
    float tube = max(0., outer-inner);
    float glow = max(0., halo-outer) * .18;
    float neonAlpha = clamp((tube+glow)*outlineStrength,0.,.98);
    float compositeAlpha = alpha + neonAlpha*(1.-alpha);
    if (compositeAlpha < .005) discard;
    if (objectMaskPass > .5) { gl_FragColor=vec4(0.,0.,0.,compositeAlpha); return; }
    vec3 base = sRGBTransferEOTF(texture2D(video, vUv)).rgb;
    // A soft convex face estimate supplies a moving key and rim. The mask
    // separates people; this is an artistic light model, not recovered 3D normals.
    vec3 normal = vec3(0.0, 0.0, 1.0);
    float nearest = 1000.0;
    for (int i=0; i<4; i++) {
      if (i >= headCount) break;
      vec2 q = (vUv-heads[i].xy) / max(heads[i].zw, vec2(0.01));
      float d = dot(q,q);
      if (d < nearest) {
        nearest = d;
        vec3 faceNormal = normalize(vec3(q.x*mirrorSign*.7, q.y*.7, sqrt(max(.06, 1.0-min(d,1.0)))));
        normal = normalize(mix(vec3(0.,0.,1.), faceNormal, 1.0-smoothstep(1.1,2.8,d)));
      }
    }
    vec3 delta = (viewMatrix * vec4(lightPosition-vWorld, 0.0)).xyz;
    float distanceSquared = dot(delta,delta);
    vec3 L = normalize(delta+vec3(0.,0.,.001));
    float falloff = 1.0 / (1.0+distanceSquared/(reach*reach));
    float key = max(dot(normal,L),0.0);
    float rim = pow(1.0-abs(normal.z),2.0) * (.3+.7*abs(L.x));
    vec2 offset = maskTexel * rimWidth;
    float ml=texture2D(mask,maskUv-vec2(offset.x,0.)).r;
    float mr=texture2D(mask,maskUv+vec2(offset.x,0.)).r;
    float mu=texture2D(mask,maskUv-vec2(0.,offset.y)).r;
    float md=texture2D(mask,maskUv+vec2(0.,offset.y)).r;
    float edge = clamp((confidence-min(min(ml,mr),min(mu,md)))*2.5,0.,1.);
    vec3 edgeNormal = normalize(vec3((ml-mr)*mirrorSign,md-mu,.05));
    float edgeLight = edge * (.2+.8*max(dot(edgeNormal,L),0.));
    vec3 illumination = lightColor * strength * falloff * (key + rimStrength*(rim+edgeLight));
    vec3 colour = base * (ambient+illumination) + illumination*.035;
    if (showMask > .5) colour = vec3(confidence);
    // Bright core and tight coloured halo, both driven by the same
    // spatially blurred, temporally interpolated mask as the person layer.
    vec3 neon = mix(outlineColor, mix(outlineColor, vec3(1.), .7), clamp(tube*1.3,0.,.65));
    vec3 composite = (colour*alpha + neon*neonAlpha*(1.-alpha)) / max(compositeAlpha,.001);
    gl_FragColor = showMask > .5 ? vec4(vec3(confidence),max(alpha,neonAlpha)) : vec4(composite, compositeAlpha);
    if (objectMaskPass > .5) gl_FragColor.rgb = vec3(0.0);
    #include <colorspace_fragment>
  }`;

export default function PortraitRelighting({ source, settings, vision, facesRef, pose }) {
  const group = useRef(), image = useRef(), background = useRef();
  const { camera, viewport, controls, size } = useThree();
  const direction = useMemo(() => new Vector3(), []);
  const origin = useMemo(() => new Vector3(), []);
  const backColour = useMemo(() => new Color(), []);
  const pulseColour = useMemo(() => new Color(), []);
  const uniforms = useMemo(() => ({
    video: {value:source.texture}, mask:{value:null}, lightPosition:{value:new Vector3()},
    lightColor:{value:new Color()}, strength:{value:1}, ambient:{value:1}, reach:{value:4},
    rimStrength:{value:.5}, rimWidth:{value:1.5}, maskTexel:{value:[1/384,1/288]}, threshold:{value:.5}, softness:{value:.24},
    outlineColor:{value:new Color("#ff19bd")}, outlineStrength:{value:1.8}, outlineWidth:{value:1.5}, outlineOffset:{value:10}, screenTexel:{value:[1/720,1/1280]},
    mirrorSign:{value:source.mirror ? -1 : 1}, showMask:{value:0}, objectMaskPass:{value:0}, headCount:{value:0},
    heads:{value:Array.from({length:4},()=>new Vector4())},
  }), [source]);
  const backgroundUniforms = useMemo(() => ({
    video:{value:source.texture}, mask:{value:null}, maskReady:{value:1}, time:{value:0}, pulseMix:{value:0},
    threshold:{value:.5}, softness:{value:.24}, outlineExtent:{value:2.4}, outlineOffset:{value:10}, clearGap:{value:24}, backgroundOpacity:{value:.75},
    maskTexel:{value:[1/384,1/288]}, screenTexel:{value:[1/720,1/1280]}, imageAspect:{value:source.width/source.height},
  }), [source]);
  const reducedMotion = useMemo(()=>window.matchMedia("(prefers-reduced-motion: reduce)"),[]);
  useFrame((_, delta) => {
    image.current.userData.segmentation = {status:vision?.current.status, frames:vision?.current.frames};
    const u = image.current.material.uniforms;
    const active = (settings.segmentation ?? true) && vision?.current.ready;
    group.current.visible = Boolean(active);
    if (!active) return;
    const distance = camera.position.distanceTo(controls?.target ?? origin);
    camera.getWorldDirection(direction);
    group.current.position.copy(camera.position).addScaledVector(direction, distance);
    group.current.quaternion.copy(camera.quaternion);
    const view = viewport.getCurrentViewport(camera, group.current.position);
    const width = Math.max(view.width, view.height*source.width/source.height);
    image.current.scale.set(source.mirror ? -width : width, width*source.height/source.width, 1);
    u.mask.value = vision.current.texture;
    u.maskTexel.value = [1/vision.current.texture.image.width,1/vision.current.texture.image.height];
    u.lightPosition.value.copy(pose.current.position);
    const front = .5 + .5*Math.tanh(pose.current.position.clone().sub(group.current.position).dot(direction)*-1);
    backColour.set(settings.relightBackColor ?? "#8b80ff");
    u.lightColor.value.set(settings.relightColor ?? "#ff9fce").lerp(backColour,1-front);
    u.strength.value = settings.relight ? settings.relightStrength : 0;
    u.ambient.value = settings.relight ? settings.relightAmbient : 1;
    u.reach.value = settings.relightReach ?? 4;
    u.rimStrength.value = settings.relightRim ?? 1;
    u.rimWidth.value = settings.relightRimWidth ?? 1.5;
    u.threshold.value = settings.maskThreshold ?? .5;
    u.softness.value = settings.maskSoftness ?? .24;
    u.outlineColor.value.set(settings.outlineColor ?? "#ff19bd");
    u.outlineStrength.value = settings.neonOutline === false ? 0 : settings.outlineStrength ?? 1.8;
    u.outlineWidth.value = settings.outlineWidth ?? 1.5;
    u.outlineOffset.value = settings.outlineOffset ?? 10;
    u.showMask.value = settings.showMask ? 1 : 0;
    // Update the actual rendered material, using exactly the mask and framing
    // used by the neon silhouette. Never leave the artwork on a separate gate.
    const bg = background.current.material.uniforms;
    background.current.visible = settings.fragranceBackground !== false;
    background.current.scale.copy(image.current.scale);
    bg.video.value = source.texture;
    bg.mask.value = u.mask.value;
    bg.maskReady.value = 1;
    bg.maskTexel.value = u.maskTexel.value;
    bg.threshold.value = u.threshold.value;
    bg.softness.value = u.softness.value;
    bg.outlineExtent.value = settings.neonOutline === false ? 0 : u.outlineWidth.value*1.6;
    bg.outlineOffset.value = settings.neonOutline === false ? 0 : u.outlineOffset.value;
    bg.clearGap.value = settings.backgroundGap ?? 24;
    bg.backgroundOpacity.value = settings.backgroundOpacity ?? .75;
    const pixelsPerWorld = size.height/view.height;
    bg.screenTexel.value = [1/(width*pixelsPerWorld),1/(width*source.height/source.width*pixelsPerWorld)];
    u.screenTexel.value = bg.screenTexel.value;
    if (!reducedMotion.matches) bg.time.value += Math.min(delta,.1)*(settings.backgroundSpeed ?? 1);
    const pulse = settings.backgroundStyle === "pulse" || (settings.backgroundStyle !== "blush" && settings.model?.includes("Pulse"));
    const targetMix = settings.autoFragranceCycle !== false && Number.isFinite(pose.current.fragranceMix)
      ? pose.current.fragranceMix : pulse ? 1 : 0;
    bg.pulseMix.value += (targetMix-bg.pulseMix.value)*(1-Math.exp(-delta*10));
    pulseColour.set(settings.pulseOutlineColor ?? "#00cfff");
    u.outlineColor.value.lerp(pulseColour,bg.pulseMix.value);
    const faces = facesRef?.current ?? [];
    u.headCount.value = Math.min(4,faces.length);
    faces.slice(0,4).forEach((f,i)=>u.heads.value[i].set(f.x+f.width/2,1-f.y-f.height/2,f.width*.6,f.height*.7));
  });
  return <group ref={group} visible={false}>
    <mesh ref={background} renderOrder={-1}>
      <planeGeometry />
      <shaderMaterial uniforms={backgroundUniforms} vertexShader={fragranceBackgroundVertex}
        fragmentShader={fragranceBackgroundFragment} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh ref={image} renderOrder={1}>
      <planeGeometry />
      <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
        transparent depthWrite toneMapped={false} />
    </mesh>
  </group>;
}
