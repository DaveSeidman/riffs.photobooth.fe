import { useEffect, useRef, useState } from "react";

export default function PortraitReveal({ original, generated }) {
  const source = useRef(), portrait = useRef(), played = useRef(false);
  const [running,setRunning] = useState(false), [complete,setComplete] = useState(false);
  useEffect(() => {
    if (played.current) return;
    let cancelled = false;
    // Decode both images before the pop so the flickers never expose an empty frame.
    Promise.allSettled([source.current?.decode(),portrait.current?.decode()]).then(() => {
      if (cancelled) return;
      played.current = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setComplete(true);
      else setRunning(true);
    });
    return () => { cancelled = true; };
  }, [original,generated]);
  return <div className={`lunar-portrait-reveal ${complete ? "is-developed" : running ? "is-developing" : "is-loading"}`}
    aria-busy={!complete}>
    <div className="lunar-reveal-images">
      <img ref={source} className="lunar-reveal-source" src={original} alt="" aria-hidden="true" />
      <img ref={portrait} className="lunar-unit lunar-reveal-portrait" src={generated}
        alt="Your cinematic Lunar fragrance campaign portrait"
        onAnimationEnd={event=>{if(event.animationName === "lunar-portrait-develop")setComplete(true);}} />
    </div>
    <div className="lunar-reveal-flash" aria-hidden="true" />
    <div className="lunar-reveal-grain" aria-hidden="true" />
    {!complete && <div className="lunar-viewfinder" aria-hidden="true">
      <div className="lunar-viewfinder-top">
        <span><b>M</b> <span className="lunar-viewfinder-af">AF-C</span> <span>ϟ</span></span>
        <span>RAW <small>14 BIT</small><svg viewBox="0 0 28 14" className="lunar-viewfinder-battery"><path d="M1 2H23V12H1ZM25 5H27V9H25M5 5V9M10 5V9M15 5V9" /></svg></span>
      </div>
      <svg className="lunar-viewfinder-guides" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <path vectorEffect="non-scaling-stroke" d="M150 125V100H185M815 100H850V125M150 575V600H185M815 600H850V575" />
        <path vectorEffect="non-scaling-stroke" className="lunar-viewfinder-focus" d="M470 340V325H485M515 325H530V340M470 360V375H485M515 375H530V360M493 350H507M500 343V357" />
      </svg>
      <div className="lunar-viewfinder-status">
        <span className="lunar-viewfinder-lock">FOCUS LOCKED</span>
        <span className="lunar-viewfinder-develop">EXPOSURE / DEVELOPING</span>
      </div>
      <div className="lunar-viewfinder-bottom">
        <span>1/250 <span>F1.8</span> <span>ISO 400</span></span>
        <div className="lunar-viewfinder-meter"><span>−2</span><span>−1</span><span>0</span><span>+1</span><span>+2</span><i /></div>
        <span className="lunar-viewfinder-count"><span className="lunar-viewfinder-count-track"><span>001</span><span>002</span><span>003</span></span><small> / LUNAR</small></span>
      </div>
    </div>}
  </div>;
}
