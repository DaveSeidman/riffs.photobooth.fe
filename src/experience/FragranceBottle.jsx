import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial, useEnvironment } from "@react-three/drei";
import { Color } from "three";
import BottleAsset from "../glass/BottleAsset.jsx";

class BottleBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
function FloatingBottle({ variant, reducedMotion }) {
  const group = useRef();
  const transmissionBackground = useMemo(() => new Color("#030207"), []);
  useFrame(({clock}) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const offset = variant === "blush" ? 0 : 1.7;
    group.current.position.y = Math.sin(t*.65+offset)*.09;
    group.current.rotation.set(.04, Math.sin(t*.45+offset)*.14, Math.sin(t*.55+offset)*.045);
  });
  return <group ref={group}>
    <BottleAsset variant={variant} material={<MeshTransmissionMaterial
      background={transmissionBackground} backside backsideEnvMapIntensity={.25} samples={6} resolution={256} backsideResolution={128}
      transmission={1} thickness={.28} backsideThickness={.1} roughness={.045} ior={1.4}
      chromaticAberration={.025} distortion={0} temporalDistortion={0}
      clearcoat={.7} clearcoatRoughness={.08} envMapIntensity={.35} />}/>
  </group>;
}
function BottleStudio({ variant, reducedMotion }) {
  const environment = useEnvironment({files:`${import.meta.env.BASE_URL}environments/studio_small_03_1k.hdr`});
  return <>
    <Environment map={environment} background={false} environmentIntensity={.25}/>
    <directionalLight position={[-3,1,-2]} color={variant === "blush" ? "#ff71c8" : "#9f87ff"} intensity={1.4}/>
    <directionalLight position={[3,2,-1]} color={variant === "blush" ? "#ffd0ed" : "#c7c3ff"} intensity={.8}/>
    <FloatingBottle variant={variant} reducedMotion={reducedMotion}/>
  </>;
}
export default function FragranceBottle({ variant }) {
  const [reducedMotion,setReducedMotion] = useState(()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(()=>{
    const query=window.matchMedia("(prefers-reduced-motion: reduce)");
    const change=()=>setReducedMotion(query.matches);
    query.addEventListener("change",change);
    return ()=>query.removeEventListener("change",change);
  },[]);
  return <span className="fragrance-bottle" aria-hidden="true">
    <BottleBoundary><Canvas camera={{position:[0,0,8.2],fov:32}} dpr={[1,1.5]}
      gl={{alpha:true,antialias:true,powerPreference:"low-power"}}>
      <ambientLight intensity={.12}/>
      <directionalLight position={[2,4,5]} intensity={.35}/>
      <Suspense fallback={null}>
        <BottleStudio variant={variant} reducedMotion={reducedMotion}/>
      </Suspense>
    </Canvas></BottleBoundary>
  </span>;
}
