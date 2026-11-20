import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import ObjectDepthOfField from "./ObjectDepthOfField.jsx";

function OrbitDepthOfField({settings,motionInfo}) {
  const effect=useRef();
  useFrame(()=>{
    if(!effect.current || !motionInfo) return;
    const rear=motionInfo.current.rear;
    effect.current.bokehScale=(settings.bokehScale ?? 2)*rear*rear;
    effect.current.cocMaterial.focusDistance=motionInfo.current.focusDistance;
  });
  return <DepthOfField ref={effect} focusDistance={settings.focusDistance} focusRange={settings.focusRange}
    bokehScale={motionInfo ? 0 : settings.bokehScale} resolutionScale={.5}/>;
}
export default function BoothPostprocessing({ settings, motionInfo }) {
  if (!settings.postprocessing) return null;
  return (
    <EffectComposer key={settings.dof ? "object-dof" : "sharp"} multisampling={2} enableNormalPass={false} mergeMode={settings.dof ? "none" : "auto"}>
      {settings.dof && <OrbitDepthOfField settings={settings} motionInfo={motionInfo}/>}
      {settings.dof && <ObjectDepthOfField />}
      {settings.bloom && (
        <Bloom intensity={settings.bloomIntensity} luminanceThreshold={settings.bloomThreshold}
          luminanceSmoothing={settings.bloomSmoothing} mipmapBlur={false} radius={0.25}/>
      )}
      <Vignette offset={0.3} darkness={settings.vignette ?? 0}/>
    </EffectComposer>
  );
}
