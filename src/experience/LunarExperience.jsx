import { useEffect, useRef, useState } from "react";
import { assetUrl, submitPhoto } from "../api.js";
import { usePortraitCamera } from "./usePortraitCamera.js";
import { Leva } from "leva";
import { QRCodeSVG } from "qrcode.react";
import { useBoothControls } from "./useBoothControls.js";
import FragranceBottle from "./FragranceBottle.jsx";
import PortraitGlass from "./PortraitGlass.jsx";
import { countPhotoFaces } from "./countPhotoFaces.js";
import PortraitReveal from "./PortraitReveal.jsx";
import { useSmileVision } from "./useSmileVision.js";
import { withDeadline } from "./withDeadline.js";
import { previewShortcut } from "./previewShortcut.js";
import { createSmileGate } from "./handsFree.js";
import "./experience.css";
import "./mirror.css";

export default function LunarExperience() {
  const camera = usePortraitCamera();
  const controls = useBoothControls();
  const [phase, setPhase] = useState("welcome"),
    [count, setCount] = useState(1),
    [analyzing, setAnalyzing] = useState(false),
    [treatment, setTreatment] = useState(null),
    [error, setError] = useState(""),
    [countdown, setCountdown] = useState(null),
    [bottleDocked, setBottleDocked] = useState(false),
    [result, setResult] = useState(null),
    [view, setView] = useState("postcard"),
    [revealRun, setRevealRun] = useState(0),
    [elapsed, setElapsed] = useState(0),
    [cue, setCue] = useState("waiting"),
    [gestureChoice, setGestureChoice] = useState(null),
    [gestureProgress, setGestureProgress] = useState(0);
  const glassCanvasRef = useRef(null);
  const request = useRef(null),
    epoch = useRef(0),
    countdownTimer = useRef(null);
  useEffect(
    () => () => {
      epoch.current++;
      request.current?.abort();
      clearInterval(countdownTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (phase !== "generating") return;
    const start = Date.now();
    setElapsed(0);
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [phase]);
  const captureBusy = useRef(false), autoCountdown = useRef(0), choiceHold = useRef(null), choiceOrigin = useRef(null);
  const gate = useRef(createSmileGate());
  const smile = useSmileVision(camera.videoRef, camera.status === "Live camera" && !["generating", "result"].includes(phase) && !controls.visible);
  const reset = () => {
    captureBusy.current = false;
    setAnalyzing(false);
    autoCountdown.current = 0;
    gate.current = createSmileGate();
    choiceHold.current = null;
    choiceOrigin.current = null;
    setGestureChoice(null);
    setGestureProgress(0);
    setCue("waiting");
    epoch.current++;
    request.current?.abort();
    request.current = null;
    clearInterval(countdownTimer.current);
    setCountdown(null);
    setBottleDocked(false);
    camera.retake();
    setTreatment(null);
    setResult(null);
    setRevealRun(0);
    setPhase("welcome");
    setError("");
  };
  const capture = ({ automatic = false } = {}) => {
    if (captureBusy.current || camera.photo || camera.status !== "Live camera" || camera.uploading) return;
    captureBusy.current = true;
    autoCountdown.current = automatic ? smile.latest.current.scores.length : 0;
    setError("");
    setPhase("capture");
    setTreatment(null);
    const id = epoch.current;
    let n = 3;
    setBottleDocked(true);
    setCountdown(n);
    countdownTimer.current = setInterval(async () => {
      if (autoCountdown.current && (document.hidden || performance.now() - smile.latest.current.timestamp > 900 || smile.latest.current.scores.length !== autoCountdown.current)) {
        clearInterval(countdownTimer.current);
        setCountdown(null); setBottleDocked(false); captureBusy.current = false; autoCountdown.current = 0;
        gate.current = createSmileGate(); setCue("waiting"); return;
      }
      n--;
      if (n > 0) {
        setCountdown(n);
        return;
      }
      clearInterval(countdownTimer.current);
      setCountdown(null);
      setCue("capturing");
      setAnalyzing(true);
      try {
        if (id === epoch.current) {
          const canvas = glassCanvasRef.current;
          let blob;
          if (canvas) {
            blob = await new Promise((resolve) =>
              canvas.toBlob(resolve, "image/jpeg", 0.94),
            );
            if (!blob)
              throw new Error(
                "The portrait could not be captured. Please try again.",
              );
            if (id === epoch.current) camera.setCaptured(blob);
          } else blob = await camera.capture();
          const detected = await withDeadline(() => countPhotoFaces(blob), 2500);
          if (id === epoch.current) {
            setCount(Math.max(1, Math.min(4, detected || autoCountdown.current || camera.detected || 1)));
            setPhase("capture");
            choiceOrigin.current = null;
          }
        }
      } catch (e) {
        if (id === epoch.current) {
          setError(e.message);
          setBottleDocked(false);
          setCue("waiting");
        }
      } finally { if (id === epoch.current) { captureBusy.current = false; autoCountdown.current = 0; setAnalyzing(false); } }
    }, 1000);
  };
  const generate = async ({
    blob = camera.photo?.blob,
    selectedTreatment = treatment,
  } = {}) => {
    if (!blob || !selectedTreatment || request.current || captureBusy.current || camera.uploading || analyzing) return;
    setTreatment(selectedTreatment);
    const id = ++epoch.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError("");
    choiceHold.current = null;
    setPhase("generating");
    try {
      const response = await submitPhoto(blob, {
        style: "dramatic-pose",
        portraitContext: { peopleCount: count, treatment: selectedTreatment },
        signal: controller.signal,
      });
      if (id !== epoch.current) return;
      if (!response.output?.postcard)
        throw new Error(
          "The campaign portrait was not returned. Please try again.",
        );
      const expected = count;
      if (expected > 1) {
        const imageResponse = await fetch(assetUrl(response.output.photo), {signal:controller.signal});
        if (imageResponse.ok) {
          const resultBlob = await imageResponse.blob();
          const actual = await withDeadline(() => countPhotoFaces(resultBlob), 2500);
          if (id !== epoch.current) return;
          if (actual !== null && actual < expected)
            throw new Error(`The AI portrait only shows ${actual} detectable face${actual === 1 ? "" : "s"}; your source has ${expected}. Please generate again to keep everyone.`);
        }
      }
      setResult(response.output);
      setView("postcard");
      setPhase("result");
    } catch (e) {
      if (id === epoch.current) {
        setError(e.message);
        setPhase("capture");
      }
    } finally {
      if (id === epoch.current) request.current = null;
    }
  };
  const actions = useRef({});
  actions.current = { capture, generate, reset };
  useEffect(() => {
    if (camera.photo && phase === "welcome") setPhase("capture");
  }, [camera.photo, phase]);
  useEffect(() => {
    if (controls.visible || camera.uploading || ["generating", "result"].includes(phase) || smile.sample.status !== "ready") return;
    const sample = smile.sample;
    if (!camera.photo && !captureBusy.current) {
      const next = gate.current(sample, sample.timestamp);
      setCue(next);
      if (next === "capture") actions.current.capture({automatic:true});
    } else if (camera.photo && !captureBusy.current) {
      if (!sample.centers.length) {
        choiceHold.current = null; choiceOrigin.current = null; setGestureProgress(0); setGestureChoice(null); return;
      }
      const center = 1 - sample.centers.reduce((a,b)=>a+b,0) / sample.centers.length;
      choiceOrigin.current ??= center;
      const shift = center - choiceOrigin.current;
      const choice = shift < -.09 ? "blush" : shift > .09 ? "pulse" : null;
      if (!choice) {
        choiceHold.current = null; setGestureProgress(0); setGestureChoice(choice); return;
      }
      if (choiceHold.current?.choice !== choice || sample.timestamp - choiceHold.current.last > 700)
        choiceHold.current = {choice, since:sample.timestamp};
      choiceHold.current.last = sample.timestamp;
      const progress = Math.min(1,(sample.timestamp-choiceHold.current.since)/1600);
      setGestureChoice(choice); setGestureProgress(progress);
      if (progress === 1) actions.current.generate({selectedTreatment:choice});
    }
  }, [smile.sample, camera.photo, camera.uploading, controls.visible, phase, count]);
  useEffect(() => {
    const keydown = event => {
      const mode=previewShortcut(event);
      if (!camera.photo && mode) {
        event.preventDefault(); event.stopPropagation(); controls.setPreviewMode(mode); return;
      }
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || controls.visible || event.target?.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName ?? "")) return;
      if (event.code === "Escape") { event.preventDefault(); actions.current.reset(); }

      else if (!camera.photo && event.code === "Space") { event.preventDefault(); actions.current.capture(); }
      else if (camera.photo && phase === "capture" && ["KeyB","KeyP"].includes(event.code)) {
        event.preventDefault(); actions.current.generate({selectedTreatment:event.code === "KeyB" ? "blush" : "pulse"});
      }
    };
    window.addEventListener("keydown",keydown,true);
    return () => window.removeEventListener("keydown",keydown,true);
  }, [camera.photo, phase, controls.visible]);
  useEffect(() => {
    if (phase !== "result" || controls.visible) return;
    const timer = setTimeout(()=>actions.current.reset(),60000);
    return () => clearTimeout(timer);
  }, [phase, controls.visible]);
  return (
    <main className={`lunar-experience lunar-mirror phase-${phase}`}>
      <Leva hidden={!controls.visible} collapsed={false} titleBar={{title:"Lunar / Booth controls"}} />
      {!controls.visible && <div className="mirror-branding" aria-label="RiiFFS Parfums — Lunar">
        <div className="mirror-brand-riiffs">
          <img src={`${import.meta.env.BASE_URL}riiffs/riiffs-logo.png`} alt="RiiFFS" />
          <span>PARFUMS</span>
        </div>
        <div className="mirror-brand-lunar">
          <span className="mirror-lunar-wordmark"><i aria-hidden="true" />LUNAR</span>
          <span className="mirror-brand-tagline">Another World. Another You.</span>
        </div>
      </div>}
      <div className="mirror-stage">
        <video ref={camera.videoRef} autoPlay playsInline muted className="lunar-camera"
          style={{opacity:camera.photo || phase === "result" ? 0 : 1}} />
        {camera.status === "Live camera" && !camera.photo && phase !== "result" && (
          <PortraitGlass videoRef={camera.videoRef} facesRef={camera.facesRef} canvasRef={glassCanvasRef}
            recede={bottleDocked} settings={{...controls.settings, orbit:controls.visible && controls.settings.orbit}} />
        )}
        {camera.photo && phase !== "result" && <img className="lunar-captured-photo" src={camera.photo.url} alt="Your captured photo" />}
        {phase === "result" && result && <PortraitReveal key={`${result.photoId}:${revealRun}`}
          original={camera.photo?.url || assetUrl(result.sourcePhoto)} generated={assetUrl(view === "postcard" ? result.postcard : result.photo)} />}
      </div>
      {!camera.photo && countdown === null && <div className="mirror-prompt" role="status" aria-live="polite">
        {camera.status === "Camera unavailable" ? <button onClick={camera.start}>Enable camera</button>
          : camera.status !== "Live camera" ? "Connecting…"
          : camera.uploading || analyzing || cue === "capturing" ? "One moment…"
          : smile.sample.status === "unavailable" ? "Tap to take a photo"
          : cue === "smile" ? "Everyone, smile"
          : cue === "settling" ? "Stay together"
          : "Step into frame"}
      </div>}
      {countdown !== null && <div className="lunar-countdown" role="status" aria-live="assertive">{countdown}</div>}
      {!camera.photo && countdown === null && !captureBusy.current && camera.status === "Live camera" &&
        <button className="mirror-shutter" aria-label="Take photo" onClick={()=>capture()} disabled={camera.uploading} />}
      {camera.photo && phase === "capture" && <section className="mirror-choice" aria-label="Choose your treatment">
        <h1 className="mirror-choice-title">find your fragrance</h1>
        <div className="lunar-treatment-choices">
          {["blush","pulse"].map(id=><button key={id} data-testid={`treatment-${id}`}
            aria-label={`Select ${id === "blush" ? "Blush" : "Pulse"}`}
            className={`lunar-treatment fragrance-button lunar-treatment--${id} ${gestureChoice===id ? "is-tracking" : ""}`}
            style={{"--hold-progress":gestureChoice===id ? gestureProgress : 0}}
            onClick={()=>generate({selectedTreatment:id})} disabled={camera.uploading || analyzing}>
            <span className="fragrance-frame" aria-hidden="true">
              <svg className="fragrance-progress" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" pathLength="1" /></svg>
            </span>
            <FragranceBottle variant={id} />
            <strong>{id === "blush" ? "Blush" : "Pulse"}</strong>
            <span className="fragrance-select">Select</span>
          </button>)}
        </div>
        <p>{analyzing ? "One moment…" : smile.sample.status === "ready" ? "Tap a bottle or lean toward it" : "Tap a bottle · or press B / P"}</p>
        <button className="mirror-text-button" onClick={reset}>Retake</button>
      </section>}
      {phase === "generating" && <div className="mirror-prompt mirror-processing" role="status">
        <span className="lunar-spinner" />
        <p>{elapsed < 40 ? `Creating ${treatment === "blush" ? "Blush" : "Pulse"}…` : "Still creating…"}</p>
        <button className="mirror-text-button" onClick={reset}>Cancel</button>
      </div>}
      {phase === "result" && result && <div className={`mirror-result-actions mirror-result-actions--${treatment || "pulse"}`}>
        <div className="mirror-photo-qr">
          <QRCodeSVG value={result.shareUrl || assetUrl(result.postcard)} size={184} level="M" marginSize={4}
            bgColor={treatment === "blush" ? "#fff5fb" : "#f4f2ff"}
            fgColor={treatment === "blush" ? "#70244e" : "#29205e"} title="Scan to open your photo" />
          <span>Scan for your photo</span>
        </div>
        <button onClick={reset}>New photo</button>
      </div>}
      {(error || camera.error) && <p className="mirror-error" role="alert">{error || camera.error}</p>}
    </main>
  );
}
