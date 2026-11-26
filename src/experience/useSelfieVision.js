import { useEffect, useRef } from "react";
import { DataTexture, LinearFilter, RedFormat, UnsignedByteType } from "three";

import { blurMask, blendMask } from "./maskSmoothing.js";

export function useSelfieVision(videoRef, enabled, settings = {}, visible = true) {
  const options = useRef(settings);
  const previewVisible = useRef(visible);
  options.current = settings;
  previewVisible.current = visible;
  const vision = useRef({ ready: false, texture: null, frames: 0, status: "off" });
  useEffect(() => {
    if (!enabled) { vision.current.ready = false; return; }
    let cancelled = false, busy = false, animation, last = 0, renderTime = 0;
    let target, current, output, width = 0, height = 0;
    const texture = new DataTexture(new Uint8Array([0]), 1, 1, RedFormat, UnsignedByteType);
    texture.minFilter = texture.magFilter = LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    Object.assign(vision.current, {texture, ready:false, status:"loading", frames:0});
    const worker = new Worker(`${import.meta.env.BASE_URL}vision/selfie-worker.js`);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const tick = async (time) => {
      if (cancelled) return;
      animation = requestAnimationFrame(tick);
      if (target && previewVisible.current) {
        blendMask(current, target, output, Math.min(100, time - (renderTime || time)), options.current.maskSmoothingMs ?? 160);
        texture.needsUpdate = true;
      }
      renderTime = time;
      const video = videoRef.current;
      const interval = previewVisible.current ? 66 : 300;
      if (busy || time - last < interval || !video?.videoWidth || video.paused || document.hidden) return;
      last = time;
      busy = true;
      try {
        const frameHeight = Math.round(384 * video.videoHeight / video.videoWidth);
        if (canvas.width !== 384 || canvas.height !== frameHeight) {
          canvas.width = 384; canvas.height = frameHeight;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const bitmap = await createImageBitmap(canvas);
        if (cancelled) { bitmap.close(); return; }
        worker.postMessage({type:"frame", bitmap, timestamp:time}, [bitmap]);
      } catch (error) { busy = false; vision.current.status = error.message; }
    };
    worker.onmessage = ({data}) => {
      if (cancelled) return;
      if (data.type === "ready") {
        vision.current.status = "running";
        animation = requestAnimationFrame(tick);
      } else if (data.type === "mask") {
        target = blurMask(new Uint8Array(data.data), data.width, data.height, options.current.maskBlur ?? 4);
        if (width !== data.width || height !== data.height) {
          width = data.width; height = data.height;
          current = new Float32Array(target);
          output = new Uint8Array(target);
          texture.image = {data:output, width, height};
        } else if (!previewVisible.current) {
          current.set(target);
          output.set(target);
        }
        texture.needsUpdate = true;
        vision.current.ready = true;
        vision.current.frames++;
        busy = false;
      } else if (data.type === "error") {
        vision.current.ready = false;
        vision.current.status = data.message;
        console.warn("[Lunar segmentation]", data.message);
        cancelAnimationFrame(animation);
      }
    };
    worker.onerror = (error) => {
      vision.current.ready = false;
      vision.current.status = error.message;
      console.warn("[Lunar segmentation]", error.message);
      cancelAnimationFrame(animation);
    };
    worker.postMessage({type:"init"});
    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      worker.terminate();
      texture.dispose();
      Object.assign(vision.current, {texture:null, ready:false, status:"off"});
    };
  }, [videoRef, enabled]);
  return vision;
}
