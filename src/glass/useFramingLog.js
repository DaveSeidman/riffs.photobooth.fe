import { useCallback, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

export function useFramingLog(controls, settings, recede) {
  const { camera } = useThree();
  const latest = useRef();
  latest.current = { settings, recede };
  const timer = useRef();
  const interacting = useRef(false);
  const save = useCallback((selected = false) => {
    if (!controls.current || latest.current.recede) return;
    const values = latest.current.settings;
    const { cameraReset, ...tuning } = values;
    const round = v => Number(v.toFixed(6));
    const snapshot = {
      timestamp: new Date().toISOString(), selected,
      camera: {
        position: camera.position.toArray().map(round),
        target: controls.current.target.toArray().map(round),
        up: camera.up.toArray().map(round), zoom: camera.zoom, fov: camera.fov,
      },
      settings: tuning,
    };
    window.lunarFraming = snapshot;
    try { localStorage.setItem("lunar:framing", JSON.stringify(snapshot)); } catch { /* optional */ }
    console.info("[Lunar framing]", JSON.stringify(snapshot));
    if (import.meta.env.DEV) void fetch("/__booth/framing", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot),
    }).catch(() => {});
  }, [camera, controls]);
  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { interacting.current = false; save(); }, 450);
  }, [save]);
  const serialized = JSON.stringify(settings);
  const previous = useRef(serialized);
  useEffect(() => {
    if (previous.current !== serialized && !recede) schedule();
    previous.current = serialized;
  }, [serialized, recede, schedule]);
  useEffect(() => {
    const selected = () => save(true);
    window.addEventListener("lunar:save-framing", selected);
    return () => { clearTimeout(timer.current); window.removeEventListener("lunar:save-framing", selected); };
  }, [save]);
  return {
    onStart: () => { interacting.current = true; },
    onChange: () => { if (interacting.current) schedule(); },
    onEnd: schedule,
  };
}
