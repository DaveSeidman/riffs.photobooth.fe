import {useEffect, useRef, useState} from 'react';
import {generationPresentation} from './generationPresentation.js';

export default function GenerationScreen({treatment,elapsed,stage}) {
  const [videoFailed,setVideoFailed]=useState(false);
  const videoRef = useRef(null);
  const {mode,message,step,caption}=generationPresentation(treatment,elapsed,stage);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = `${import.meta.env.BASE_URL}riiffs/${mode}.mp4`;
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [mode,videoFailed]);
  return <section className={`generation-screen generation-screen--${mode}`} aria-label={`Creating your Lunar ${mode} portrait`}>
    <div className="generation-film">
      {!videoFailed && <video ref={videoRef}
        autoPlay loop muted playsInline preload="none" aria-hidden="true"
        onError={()=>setVideoFailed(true)} />}
    </div>
    <div className="generation-footer">
      <p className="generation-message" role="status" aria-live="polite" aria-atomic="true">{message}</p>
      <div className="generation-progress" role="progressbar" aria-label="Portrait generation stage"
        aria-valuemin={1} aria-valuemax={4} aria-valuenow={step+1} aria-valuetext={caption}>
        <span style={{transform:`scaleX(${(step+1)/4})`}} />
      </div>
      <p className="generation-caption" role="status">{caption}</p>
    </div>
  </section>;
}
