import { useCallback, useEffect, useRef, useState } from "react";
import { withDeadline } from "./withDeadline.js";
import { countPhotoFaces } from "./countPhotoFaces.js";
import { detectPortraitFaces } from "./detectPortraitFaces.js";

export function usePortraitCamera() {
  const videoRef = useRef(null),
    stream = useRef(null),
    version = useRef(0),
    urlRef = useRef(null);
  const facesRef = useRef([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("Connecting camera…"),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState(null),
    [detected, setDetected] = useState(0);
  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  const start = useCallback(async () => {
    const id = ++version.current;
    setError("");
    setStatus("Connecting camera…");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Camera access needs localhost or HTTPS.");
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });
      if (id !== version.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stop();
      stream.current = media;
      videoRef.current.srcObject = media;
      await videoRef.current.play();
      if (id === version.current) setStatus("Live camera");
    } catch (e) {
      if (id === version.current) {
        stop();
        setStatus("Camera unavailable");
        setError(
          e.name === "NotAllowedError"
            ? "Allow camera access to continue."
            : e.message,
        );
      }
    }
  }, [stop]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void start();
    });
    return () => {
      cancelled = true;
      version.current++;
      stop();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [start, stop]);
  useEffect(() => {
    if (status !== "Live camera" || photo) return;
    let cancelled = false,
      detector,
      timer;
    let candidate = 0,
      repeats = 0;
    (async () => {
      try {
        const { FaceDetector, FilesetResolver } =
          await import("@mediapipe/tasks-vision");
        const root = `${import.meta.env.BASE_URL}vision/`;
        // The detector script loader expects a classic Emscripten bundle.
        const files = await FilesetResolver.forVisionTasks(`${root}wasm`);
        if (cancelled) return;
        detector = await FaceDetector.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: `${root}face-detector.tflite`,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.6,
        });
        if (cancelled) {
          detector.close();
          return;
        }
        const scratch = document.createElement("canvas");
        timer = setInterval(() => {
          if (!videoRef.current?.videoWidth) return;
          try {
            const video = videoRef.current;
            const detections = detectPortraitFaces(video,input=>detector.detectForVideo(input,performance.now()),scratch);
            facesRef.current = detections;
            const n = detections.length;
            if (candidate === n) repeats++;
            else {
              candidate = n;
              repeats = 1;
            }
            if (repeats >= 3) setDetected(n);
          } catch {
            /* Manual group-size controls remain available. */
          }
        }, 500);
      } catch {
        /* Face detection is optional and never blocks capture. */
      }
    })();
    return () => {
      cancelled = true;
      clearInterval(timer);
      facesRef.current = [];
      detector?.close();
    };
  }, [status, photo]);
  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth)
      throw new Error("Enable the camera first.");
    const canvas = document.createElement("canvas");
    canvas.height = 1600;
    canvas.width = Math.round(1600 * window.innerWidth / window.innerHeight);
    const c = canvas.getContext("2d"),
      target = canvas.width / canvas.height,
      aspect = video.videoWidth / video.videoHeight;
    const w = aspect > target ? video.videoHeight * target : video.videoWidth,
      h = w / target;
    c.translate(canvas.width, 0);
    c.scale(-1, 1);
    c.drawImage(
      video,
      (video.videoWidth - w) / 2,
      (video.videoHeight - h) / 2,
      w,
      h,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.94),
    );
    if (!blob) throw new Error("The camera could not capture that frame.");
    setCaptured(blob);
    return blob;
  };
  const setCaptured = (blob, peopleCount = detected || undefined) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(blob);
    setPhoto({ blob, url: urlRef.current, peopleCount });
    setError("");
  };
  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const faces = await withDeadline(() => countPhotoFaces(file), 2500);
      const peopleCount = faces > 0 ? Math.min(4,faces) : undefined;
      setCaptured(file, peopleCount);
      return peopleCount;
    } catch {
      setError("Please choose a JPG, PNG or WebP photo.");
    } finally { setUploading(false); }
  };
  const retake = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPhoto(null);
  };
  return {
    videoRef,
    facesRef,
    status,
    error,
    photo,
    uploading,
    detected,
    start,
    capture,
    setCaptured,
    upload,
    retake,
  };
}
