import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
} from "three";

export default function SwirlSparkles({ pose, settings }) {
  const points = useRef();
  const { geometry, seeds, map } = useMemo(() => {
    // Stable low-discrepancy seeds keep the cloud unchanged while tuning.
    const count = 140,
      positions = new Float32Array(count * 3),
      colors = new Float32Array(count * 3);
    const seeds = Array.from({ length: count }, (_, i) => ({
      // Loose helical strands make the rotation readable instead of an
      // almost rotationally symmetric cloud that appears to stand still.
      angle: (i % 3) * (Math.PI * 2 / 3) + (((i * 0.7548776) % 1) - 0.5) * 3.2
        + ((i * 0.6180339) % 1) * 0.25,
      radius: 1.2 + ((i * 0.6180339) % 1) * 0.35,
      y: (((i * 0.7548776) % 1) - 0.5) * 3.9,
    }));
    const c = new Color();
    for (let i = 0; i < count; i++) {
      c.set(i % 3 === 0 ? "#ffc8e8" : i % 3 === 1 ? "#d7d3ff" : "#fff9e8");
      c.toArray(colors, i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d"),
      g = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.13, "rgba(255,255,255,.96)");
    g.addColorStop(0.28, "rgba(255,255,255,.25)");
    g.addColorStop(0.65, "rgba(255,255,255,.035)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = g;
    context.fillRect(0, 0, 64, 64);
    return { geometry, seeds, map: new CanvasTexture(canvas) };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      map.dispose();
    },
    [geometry, map],
  );
  useFrame(({ clock }, dt) => {
    const p = pose.current;
    // Follow the actual model orientation: adding its Y angle to polar
    // coordinates rotates in the opposite direction to Three's Y rotation.
    points.current.quaternion.slerp(
      p.quaternion,
      1 - Math.exp(-(settings.sparkleFollow ?? 1.8) * Math.min(dt, 0.1)),
    );
    points.current.position.copy(p.position);
    points.current.scale.setScalar(p.scale);
    const a = geometry.attributes.position;
    seeds.forEach((s, i) => {
      const turn = s.angle + Math.sin(clock.elapsedTime * 0.18 + i) * 0.06;
      a.setXYZ(
        i,
        Math.cos(turn) * s.radius,
        s.y + Math.sin(clock.elapsedTime * 0.3 + s.angle) * 0.1,
        Math.sin(turn) * s.radius,
      );
    });
    a.needsUpdate = true;
    points.current.material.opacity = settings.sparkleOpacity ?? 0.8;
    points.current.material.size = settings.sparkleSize ?? 0.045;
  });
  return (
    <points ref={points} geometry={geometry} frustumCulled={false} userData={{dofObject:true}}>
      <pointsMaterial
        map={map}
        color="white"
        size={0.045}
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
