import { useEffect, useRef, useState } from "react";

export function useSmileVision(videoRef, enabled) {
  const [sample, setSample] = useState({scores:[], centers:[], timestamp:0, status:"loading"});
  const latest = useRef(sample);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false, busy = false, timer;
    const worker = new Worker(`${import.meta.env.BASE_URL}vision/smile-worker.js`);
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    const publish = value => { latest.current = value; setSample(value); };
    const tick = async () => {
      const video = videoRef.current;
      if (busy || !video?.videoWidth || video.paused || document.hidden) return;
      busy = true;
      try {
        // Match the visible portrait crop, so offscreen people cannot block capture.
        const aspect = window.innerWidth / window.innerHeight;
        const w = Math.min(video.videoWidth, video.videoHeight * aspect), h = w / aspect;
        canvas.width = Math.round(640 * aspect); canvas.height = 640;
        ctx.drawImage(video,(video.videoWidth-w)/2,(video.videoHeight-h)/2,w,h,0,0,canvas.width,canvas.height);
        const bitmap = await createImageBitmap(canvas);
        if (cancelled) { bitmap.close(); return; }
        worker.postMessage({type:"frame", bitmap, timestamp:performance.now()}, [bitmap]);
      } catch { busy = false; }
    };
    worker.onmessage = ({data}) => {
      if (cancelled) return;
      if (data.type === "ready") { timer = setInterval(tick, 125); }
      if (data.type === "faces") { busy = false; publish({...data,status:"ready"}); }
      if (data.type === "error") { clearInterval(timer); publish({scores:[],centers:[],timestamp:0,status:"unavailable"}); }
    };
    worker.onerror = () => { clearInterval(timer); publish({scores:[],centers:[],timestamp:0,status:"unavailable"}); };
    worker.postMessage({type:"init"});
    return () => { cancelled = true; clearInterval(timer); worker.terminate(); };
  }, [videoRef, enabled]);
  return {sample, latest};
}
