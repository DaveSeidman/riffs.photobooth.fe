import {useState} from 'react';
import {generationPresentation} from './generationPresentation.js';

export default function GenerationScreen({treatment,elapsed}) {
  const [videoFailed,setVideoFailed]=useState(false);
  const {mode,message,progress}=generationPresentation(treatment,elapsed);
  return <section className={`generation-screen generation-screen--${mode}`} aria-label={`Creating your Lunar ${mode} portrait`}>
    <div className="generation-film">
      {!videoFailed && <video src={`${import.meta.env.BASE_URL}riiffs/${mode}.mp4`}
        autoPlay loop muted playsInline preload="auto" aria-hidden="true"
        onError={()=>setVideoFailed(true)} />}
    </div>
    <div className="generation-footer">
      <p className="generation-message" role="status" aria-live="polite" aria-atomic="true">{message}</p>
      <div className="generation-progress" role="progressbar" aria-label="Estimated photo progress"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext="Estimated progress. Your photo is still being created.">
        <span style={{transform:`scaleX(${progress/100})`}} />
      </div>
      <p className="generation-caption">Creating your photo · Progress is estimated</p>
    </div>
  </section>;
}
