import { Component, Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { VideoTexture, SRGBColorSpace } from "three";
import GlassScene from "../glass/GlassScene.jsx";
import BoothPostprocessing from "../glass/BoothPostprocessing.jsx";
import { glassDefaults } from "../glass/settings.js";
import { useSelfieVision } from "./useSelfieVision.js";

class GlassBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function PortraitGlass({
  videoRef,
  facesRef,
  canvasRef,
  recede,
  settings = glassDefaults,
}) {
  const motionInfo = useRef({rear:0,focusDistance:8});
  const [source, setSource] = useState(null);
  const vision = useSelfieVision(videoRef, settings.segmentation ?? true, settings);
  useEffect(() => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const texture = new VideoTexture(video);
    texture.colorSpace = SRGBColorSpace;
    setSource({
      texture,
      width: video.videoWidth,
      height: video.videoHeight,
      mirror: true,
    });
    return () => texture.dispose();
  }, [videoRef]);
  if (!source) return null;
  return (
    <div className="lunar-glass-preview">
      <GlassBoundary>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 38 }}
          dpr={1}
          gl={{
            antialias: false,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
          }}
        >
          <Suspense fallback={null}>
            <GlassScene
              source={source}
              vision={vision}
              facesRef={facesRef}
              settings={settings}
              canvasRef={canvasRef}
              recede={recede}
              motionInfo={motionInfo}
            />
            <BoothPostprocessing settings={settings} motionInfo={motionInfo} />
          </Suspense>
        </Canvas>
      </GlassBoundary>
    </div>
  );
}
