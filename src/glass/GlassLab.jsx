import React, { Component, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import GlassScene from './GlassScene.jsx';
import { useCameraSource } from './useCameraSource.js';
import './glass.css';

import { glassDefaults as defaults } from "./settings.js";
class RenderBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <div className="glass-render-error">The glass renderer needs WebGL 2. Try a browser with hardware acceleration enabled.<button onClick={() => location.reload()}>Reload</button></div> : this.props.children; }
}
function Slider({ label, name, min, max, step = .01, settings, update, suffix = '' }) {
  return <label className="glass-slider"><span>{label}<output>{settings[name].toFixed(step >= 1 ? 0 : 2)}{suffix}</output></span>
    <input type="range" min={min} max={max} step={step} value={settings[name]} onChange={e => update({ [name]: Number(e.target.value) })} /></label>;
}
export default function GlassLab() {
  const [settings, setSettings] = useState(() => ({ ...defaults, spinning: !matchMedia('(prefers-reduced-motion: reduce)').matches }));
  const { source, status, error, startCamera, loadPhoto, reset } = useCameraSource();
  useEffect(() => {
    // Defer the request so StrictMode's discarded mount does not open a camera.
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void startCamera(); });
    return () => { cancelled = true; };
  }, []);
  const canvasRef = useRef(), uploadRef = useRef();
  const [saveError, setSaveError] = useState('');
  const update = patch => setSettings(s => ({ ...s, ...patch }));
  const capture = () => {
    setSaveError('');
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) { setSaveError('Could not capture this frame. Please try again.'); return; }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `riiffs-lunar-glass-${Date.now()}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };
  return <div className="glass-lab">
    <header className="glass-header"><a href="#/" className="glass-wordmark" aria-label="RiiFFS Lunar home">RiiFFS<span>PARFUMS</span></a>
      <span className="glass-project">LUNAR / OPTICAL STUDIES</span><a className="glass-edition" href="#/experience">Try Pulse × Blush ↗</a></header>
    <main className="glass-layout">
      <section className="glass-stage-column" aria-label="Glass refraction preview">
        <div className="glass-stage-heading"><span><i className={status === 'Live camera' ? 'is-live' : ''} />{status}</span><span>OCTAGON / Y-AXIS</span></div>
        <div className="glass-stage">
          {source && <RenderBoundary><Canvas camera={{ position: [0, 0, 8], fov: 38 }} dpr={[1, 1.75]} gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
            <Suspense fallback={null}><GlassScene source={source} settings={settings} canvasRef={canvasRef} /></Suspense>
          </Canvas></RenderBoundary>}
          <span className="glass-stage-caption">THROUGH THE LOOKING GLASS</span>
          <button className="glass-compare" onClick={() => update({ visible: !settings.visible })}>{settings.visible ? 'Hide glass' : 'Show glass'}</button>
        </div>
        <div className="glass-source-actions"><button className="glass-primary" onClick={startCamera} disabled={status === 'Connecting…'}>{status === 'Live camera' ? 'Reconnect camera' : 'Enable camera'}<span>↗</span></button>
          <button onClick={() => uploadRef.current.click()}>Try a photo</button><button onClick={reset}>Test card</button>
          <input ref={uploadRef} type="file" accept="image/*" hidden onChange={e => { loadPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="glass-save" onClick={capture}>Save frame ↓</button></div>
        <p className="glass-camera-note" aria-live="polite">{error || saveError || 'Your camera stays on this device. You can also try a photo or the test card.'}</p>
      </section>
      <aside className="glass-controls"><div className="glass-intro"><span className="glass-eyebrow">FORM & LIGHT / 001</span><h1>A different<br /><em>point of view.</em></h1><p>A solid glass octagon between you and the lens. Turn it. Catch the light. See what changes.</p></div>
        <div className="glass-control-group"><div className="glass-group-title"><h2>The glass</h2><button onClick={() => setSettings({ ...defaults })}>Reset</button></div>
          <Slider label="Thickness" name="thickness" min={0} max={5} settings={settings} update={update} />
          <Slider label="Refraction" name="ior" min={1} max={2.3} settings={settings} update={update} />
          <Slider label="Panel convexity" name="convexity" min={0} max={.25} settings={settings} update={update} />
          <Slider label="Edge rounding" name="bevel" min={.015} max={.18} settings={settings} update={update} />
          <Slider label="Scale" name="scale" min={.4} max={1.6} settings={settings} update={update} />
        </div>
        <div className="glass-control-group"><h2>The light</h2>
          <Slider label="Reflective highlights" name="highlights" min={0} max={4} settings={settings} update={update} />
          <Slider label="Surface roughness" name="roughness" min={0} max={.4} settings={settings} update={update} />
          <Slider label="Colour separation" name="chromatic" min={0} max={.2} settings={settings} update={update} />
          <div className="glass-tints"><span>Glass tint</span>{[['Clear','#ffffff'],['Pulse','#c4ccff'],['Blush','#ffd2e2']].map(([label,color]) => <button key={label} aria-pressed={settings.tint === color} onClick={() => update({ tint: color })}><i style={{ background: color }} />{label}</button>)}</div>
        </div>
        <div className="glass-control-group"><div className="glass-group-title"><h2>The movement</h2><button aria-pressed={settings.spinning} onClick={() => update({ spinning: !settings.spinning })}>{settings.spinning ? 'Ⅱ Pause' : '▷ Rotate'}</button></div>
          <Slider label="Y rotation" name="rotation" min={-180} max={180} step={1} settings={settings} update={update} suffix="°" />
          <Slider label="Rotation speed" name="speed" min={0} max={1} settings={settings} update={update} />
        </div>
      </aside>
    </main><footer className="glass-footer"><span>RiiFFS / LUNAR ECLIPSE</span><span>NEW YORK · 2026</span><a href="#/booth">Photobooth flow ↗</a></footer>
  </div>;
}
