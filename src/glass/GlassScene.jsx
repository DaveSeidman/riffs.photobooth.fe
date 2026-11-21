import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  MeshTransmissionMaterial,
  OrbitControls,
} from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import { followTarget } from "./followTarget.js";
import { advanceFragranceCycle, createFragranceCycle, fragranceMix, swapPose } from "./fragranceCycle.js";
import CameraEnvironment from "./CameraEnvironment.jsx";
import BottleAsset from "./BottleAsset.jsx";
import SwirlSparkles from "./SwirlSparkles.jsx";
import { easeInOutQuad } from "./settings.js";
import { createOctagonalGlass } from "./geometry.js";
import { useFramingLog } from "./useFramingLog.js";
import PortraitRelighting from "./PortraitRelighting.jsx";

const captureBottle = { z: 1.1, scale: .18, bottomMargin: .24 };

function BoothOrbit({ settings, recede }) {
  const controls = useRef();
  const events = useFramingLog(controls, settings, recede);
  useEffect(() => {
    controls.current?.reset();
  }, [settings.cameraReset, recede]);
  return <OrbitControls ref={controls} {...events} makeDefault enabled={(settings.orbit ?? true) && !recede}
    enablePan={settings.orbitPan ?? true} enableZoom={settings.orbitZoom ?? true}
    enableDamping dampingFactor={0.08} minDistance={3} maxDistance={16} />;
}

function Backdrop({ source, settings, progress, pose, vision }) {
  const { viewport, camera, controls } = useThree();
  const group = useRef(), image = useRef(), shadow = useRef();
  const direction = useMemo(() => new Vector3(), []);
  const projected = useMemo(() => new Vector3(), []);
  const origin = useMemo(() => new Vector3(), []);
  const shadowUniforms = useMemo(() => ({ strength: { value: 1 } }), []);
  useFrame((_, delta) => {
    if (!shadow.current) return;
    const p = progress.current;
    // Keep the live feed facing the viewer as the camera orbits the model.
    const distance = camera.position.distanceTo(controls?.target ?? origin) + Math.max(2.2,(settings.headOrbitDepth ?? 1.6)+.8);
    camera.getWorldDirection(direction);
    group.current.position.copy(camera.position).addScaledVector(direction, distance);
    group.current.quaternion.copy(camera.quaternion);
    const view = viewport.getCurrentViewport(camera, group.current.position);
    const width = Math.max(view.width, view.height * source.width / source.height);
    image.current.scale.set(source.mirror ? -width : width, width * source.height / source.width, 1);
    image.current.material.color.setScalar(1);
    projected.copy(pose.current.position).project(camera);
    shadow.current.position.set(
      projected.x * view.width / 2 + 0.16 * (1 - p),
      projected.y * view.height / 2 - 0.18 * (1 - p),
      0.05,
    );
    shadow.current.scale.set(4.7 * (1 - 0.76 * p), 3.6 * (1 - 0.76 * p), 1);
    shadowUniforms.strength.value = 0;
  });
  const view = viewport.getCurrentViewport(camera, [0, 0, -2.2]);
  const imageAspect = source.width / source.height;
  const width = Math.max(view.width, view.height * imageAspect);
  const height = width / imageAspect;
  return (
    <group ref={group} position={[0, 0, -2.2]}>
      <mesh
        ref={image}
        renderOrder={-2}
        scale={[source.mirror ? -width : width, height, 1]}
      >
        <planeGeometry />
        <meshBasicMaterial map={source.texture} toneMapped={false} />
      </mesh>
      <mesh ref={shadow} position={[0.16, -0.18, 0.05]} scale={[4.7, 3.6, 1]}>
        <planeGeometry />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={shadowUniforms}
          vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
          fragmentShader={`uniform float strength; varying vec2 vUv;void main(){float d=length((vUv-.5)*2.);gl_FragColor=vec4(.025,.018,.055,(1.-smoothstep(.25,1.,d))*.23*strength);}`}
        />
      </mesh>
    </group>
  );
}

function TransmissionGlass({ settings }) {
  return (
    <MeshTransmissionMaterial
      backside={settings.backside ?? true}
      samples={6}
      resolution={512}
      backsideResolution={256}
      transmission={settings.transmission ?? 1}
      thickness={settings.thickness}
      backsideThickness={
        settings.backsideThickness ?? settings.thickness * 0.35
      }
      ior={settings.ior}
      roughness={settings.roughness}
      chromaticAberration={settings.chromatic}
      anisotropicBlur={0.02}
      distortion={settings.distortion ?? 0}
      temporalDistortion={0}
      color={settings.tint}
      attenuationColor={settings.tint}
      attenuationDistance={settings.attenuationDistance ?? 4}
      clearcoat={settings.clearcoat ?? 1}
      clearcoatRoughness={settings.clearcoatRoughness ?? 0.035}
      envMapIntensity={settings.highlights}
      backsideEnvMapIntensity={settings.highlights}
    />
  );
}

function Glass({ settings, recede = false, progress, pose, source, facesRef, motionInfo }) {
  const mesh = useRef(),
    angle = useRef(0);
  const { viewport, camera, controls } = useThree();
  const headAngle = useRef(0);
  const bottles = useRef({});
  const cycle = useRef(createFragranceCycle(settings.model?.includes("Pulse") ? "pulse" : "blush"));
  const reducedMotion = useMemo(()=>window.matchMedia("(prefers-reduced-motion: reduce)"),[]);
  useEffect(()=>{ cycle.current=createFragranceCycle(settings.model?.includes("Pulse") ? "pulse" : "blush"); },[settings.model]);
  const tracking = useMemo(() => ({
    direction:new Vector3(), right:new Vector3(), up:new Vector3(), origin:new Vector3(),
    center:new Vector3(), anchor:new Vector3(), position:new Vector3(), targetPosition:new Vector3(), initialized:false, radius:0, rear:0, focusDistance:8, positioned:false, missingFor:0,
  }), []);
  const motion = useRef({ from: 0, to: 0, progress: 0, started: null });
  useEffect(() => {
    motion.current = {
      from: motion.current.progress,
      to: recede ? 1 : 0,
      progress: motion.current.progress,
      started: null,
    };
  }, [recede]);
  const geometry = useMemo(
    () => createOctagonalGlass(settings),
    [settings.convexity, settings.bevel],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }, delta) => {
    const m = motion.current;
    if (m.started === null) m.started = clock.elapsedTime;
    const t = easeInOutQuad(
      (clock.elapsedTime - m.started) / (settings.moveDuration || 1.4),
    );
    m.progress = m.from + (m.to - m.from) * t;
    progress.current = m.progress;
    const baseScale = Math.min(1, viewport.width / 5.1) * settings.scale;
    const hoveringScale = settings.headOrbit ? settings.headOrbitScale ?? .3 : 1;
    let x = settings.positionX ?? 0, y = settings.positionY ?? 0, z = settings.positionZ ?? 0;
    if (settings.headOrbit) {
      const a = tracking;
      camera.getWorldDirection(a.direction);
      a.right.setFromMatrixColumn(camera.matrixWorld,0);
      a.up.setFromMatrixColumn(camera.matrixWorld,1);
      const target = controls?.target ?? a.origin;
      const distance = camera.position.distanceTo(target);
      a.center.copy(camera.position).addScaledVector(a.direction,distance);
      const view = viewport.getCurrentViewport(camera,a.center);
      const imageWidth = Math.max(view.width,view.height*source.width/source.height);
      const imageHeight = imageWidth*source.height/source.width;
      const faces = facesRef?.current ?? [];
      let headWidth = 0;
      if (faces.length) {
        const left = Math.min(...faces.map(f=>f.x)), right = Math.max(...faces.map(f=>f.x+f.width));
        const top = Math.min(...faces.map(f=>f.y)), bottom = Math.max(...faces.map(f=>f.y+f.height));
        const u = source.mirror ? 1-(left+right)/2 : (left+right)/2;
        a.center.addScaledVector(a.right,(u-.5)*imageWidth).addScaledVector(a.up,(.5-(top+bottom)/2)*imageHeight);
        headWidth = (right-left)*imageWidth;
        a.missingFor=0;
      } else {
        a.missingFor+=delta;
        if(a.initialized && a.missingFor<.8) a.center.copy(a.anchor);
        else a.center.addScaledVector(a.up,.45);
      }
      if (!a.initialized) { a.anchor.copy(a.center); a.initialized = true; }
      a.anchor.lerp(a.center,1-Math.exp(-2.8*Math.min(delta,.1)));
      if (settings.headOrbitMoving ?? true) headAngle.current += Math.min(delta,.05)*(settings.headOrbitSpeed ?? .4);
      const theta = headAngle.current + (settings.headOrbitPhase ?? 0)*Math.PI/180;
      const targetRadius = Math.min(Math.max(settings.headOrbitRadius ?? 1.6,headWidth/2+.55),view.width*.43);
      if (!a.radius) a.radius=targetRadius;
      a.radius+=(targetRadius-a.radius)*(1-Math.exp(-2.5*Math.min(delta,.1)));
      const radius=a.radius;
      a.rear=Math.max(0,-Math.sin(theta));
      a.focusDistance=distance;
      a.position.copy(a.anchor)
        .addScaledVector(a.right,Math.cos(theta)*radius)
        .addScaledVector(a.up,(settings.headOrbitLift ?? .1)+Math.sin(theta*2)*.18)
        .addScaledVector(a.direction,-Math.sin(theta)*(settings.headOrbitDepth ?? 1.6));
      x += a.position.x; y += a.position.y; z += a.position.z;
    }
    const targetHeight = viewport.getCurrentViewport(
      camera,
      [0, 0, captureBottle.z],
    ).height;
    const targetY = -targetHeight / 2 + (3.45 * baseScale * captureBottle.scale) / 2 + captureBottle.bottomMargin;
    tracking.targetPosition.set(
      x * (1 - m.progress),
      y * (1 - m.progress) + targetY * m.progress,
      z * (1 - m.progress) + captureBottle.z*m.progress,
    );
    if (!tracking.positioned) {mesh.current.position.copy(tracking.targetPosition);tracking.positioned=true;}
    followTarget(mesh.current.position, tracking.targetPosition, delta, recede ? 9 : settings.positionFollow ?? 4);
    const scale = baseScale*(hoveringScale*(1-m.progress)+captureBottle.scale*m.progress);
    mesh.current.scale.setScalar(scale);
    if (settings.spinning)
      angle.current += Math.min(delta, 0.05) * settings.speed;
    pose.current.angle = angle.current + (settings.rotation * Math.PI) / 180;
    pose.current.position.copy(mesh.current.position);
    pose.current.scale = scale;
    mesh.current.rotation.set(
      0.12,
      angle.current + (settings.rotation * Math.PI) / 180,
      settings.model && settings.model !== "Octagon"
        ? -0.06
        : Math.PI / 2 - 0.06,
    );
    pose.current.quaternion.copy(mesh.current.quaternion);
    const state=advanceFragranceCycle(cycle.current,Math.min(delta,.1),{
      rear:settings.headOrbit?tracking.rear:1, paused:recede || document.hidden,
      enabled:settings.autoFragranceCycle !== false && settings.model !== "Octagon",
      interval:settings.fragranceCycleSeconds ?? 30,
    });
    pose.current.fragranceMix=fragranceMix(state);
    for(const variant of ["blush","pulse"]) {
      const bottle=bottles.current[variant]; if(!bottle) continue;
      if(state.swapping) {
        const p=swapPose(state.transition,variant===state.to,reducedMotion.matches);
        bottle.visible=p.scale>.001;
        bottle.scale.setScalar(Math.max(.001,p.scale));
        bottle.position.set(p.x,p.y,p.z); bottle.rotation.set(0,p.turn,p.x*.12);
      } else {
        bottle.visible=variant===state.current;
        bottle.scale.setScalar(1); bottle.position.set(0,0,0); bottle.rotation.set(0,0,0);
      }
    }
    if(motionInfo) {
      motionInfo.current.rear += ((recede?0:tracking.rear)-motionInfo.current.rear)*(1-Math.exp(-4*delta));
      motionInfo.current.focusDistance=tracking.focusDistance;
    }
  });
  const scale = Math.min(1, viewport.width / 5.1) * settings.scale;
  return (
    <group ref={mesh} scale={scale} userData={{dofObject:true}}>
      {settings.model && settings.model !== "Octagon" ? (
        <Suspense fallback={null}>
          {["blush","pulse"].map(variant=><group key={variant} ref={node=>{bottles.current[variant]=node;}}
            visible={variant===cycle.current.current}>
            <BottleAsset variant={variant} material={<TransmissionGlass settings={settings}/>}/>
          </group>)}
        </Suspense>
      ) : (
        <mesh geometry={geometry}>
          <TransmissionGlass settings={settings} />
        </mesh>
      )}
    </group>
  );
}

export default function GlassScene({
  source,
  settings,
  canvasRef,
  recede = false,
  vision,
  facesRef,
  motionInfo,
}) {
  const { gl } = useThree();
  const progress = useRef(0);
  const pose = useRef({ angle: 0, position: new Vector3(), quaternion: new Quaternion(), scale: 1 });
  useFrame(() => {
    // EffectComposer leaves autoClear disabled between its own frames.
    // Drei's earlier transmission passes reuse two FBOs and rely on render()
    // to clear them. Without this, old sparkles and depth accumulate in glass.
    gl.autoClear = true;
  }, -100);
  useEffect(() => {
    canvasRef.current = gl.domElement;
    return () => {
      canvasRef.current = null;
    };
  }, [gl, canvasRef]);
  return (
    <>
      <ambientLight intensity={0.3} />
      <BoothOrbit settings={settings} recede={recede} />
      <Backdrop
        source={source}
        settings={settings}
        progress={progress}
        pose={pose}
        vision={vision}
      />
      {settings.visible && (
        <Glass
          settings={settings}
          recede={recede}
          progress={progress}
          pose={pose}
          source={source}
          facesRef={facesRef}
          motionInfo={motionInfo}
        />
      )}
      <PortraitRelighting source={source} settings={settings} vision={vision} facesRef={facesRef} pose={pose} />
      {(settings.sparkles ?? true) && settings.visible && (
        <SwirlSparkles pose={pose} settings={settings} />
      )}
      <CameraEnvironment source={source} settings={settings} />
    </>
  );
}
