import { Component, Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useEnvironment, useGLTF } from "@react-three/drei";
import BottleAsset from "../glass/BottleAsset.jsx";

const studioEnvironment = { files: `${import.meta.env.BASE_URL}environments/studio_small_03_1k.hdr` };

export function preloadFragranceDisplays() {
  useEnvironment.preload(studioEnvironment);
  for (const variant of ["blush", "pulse"]) {
    useGLTF.preload(`${import.meta.env.BASE_URL}models/lunar-${variant}.glb`);
  }
}

class BottleBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onReady(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function RotatingBottle({ variant, reducedMotion, onReady }) {
  const bottle = useRef();
  const ready = useRef(false);
  useFrame((_, delta) => {
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    if (!reducedMotion) bottle.current.rotation.y += Math.min(delta, 0.15) * 0.32;
  });
  return <group ref={bottle} rotation-y={variant === "blush" ? 0.16 : -0.16}>
    <BottleAsset variant={variant} material={<meshPhysicalMaterial
      color="#f0e8ff" transparent opacity={0.25} depthWrite={false}
      roughness={0.12} metalness={0.06} clearcoat={1}
      clearcoatRoughness={0.08} envMapIntensity={1.25} />}/>
  </group>;
}
function BottleStudio({ variant, reducedMotion, onReady }) {
  const environment = useEnvironment(studioEnvironment);
  return <>
    <Environment map={environment} background={false} environmentIntensity={.25}/>
    <directionalLight position={[-3,1,-2]} color={variant === "blush" ? "#ff71c8" : "#9f87ff"} intensity={1.4}/>
    <directionalLight position={[3,2,-1]} color={variant === "blush" ? "#ffd0ed" : "#c7c3ff"} intensity={.8}/>
    <RotatingBottle variant={variant} reducedMotion={reducedMotion} onReady={onReady}/>
  </>;
}
export default function FragranceBottle({ variant }) {
  const [ready, setReady] = useState(false);
  const [reducedMotion,setReducedMotion] = useState(()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(()=>{
    const query=window.matchMedia("(prefers-reduced-motion: reduce)");
    const change=()=>setReducedMotion(query.matches);
    query.addEventListener("change",change);
    return ()=>query.removeEventListener("change",change);
  },[]);
  const onReady = () => setReady(true);
  return <span className="fragrance-bottle" aria-hidden="true" data-ready={ready}>
    <BottleBoundary onReady={onReady}><Canvas camera={{position:[0,0.65,9],fov:29}} dpr={1}
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{alpha:true,antialias:true}}>
      <ambientLight intensity={.12}/>
      <directionalLight position={[2,4,5]} intensity={.35}/>
      <Suspense fallback={null}>
        <BottleStudio variant={variant} reducedMotion={reducedMotion} onReady={onReady}/>
      </Suspense>
    </Canvas></BottleBoundary>
  </span>;
}
