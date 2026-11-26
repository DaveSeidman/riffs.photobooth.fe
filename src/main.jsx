import React, {Suspense,lazy,useEffect,useState} from "react";
import ReactDOM from "react-dom/client";
import "./base.css";
const LunarExperience=lazy(()=>import('./experience/LunarExperience.jsx'));
const ReviewGallery=lazy(()=>import('./review/ReviewGallery.jsx'));
function App() {
  const [route,setRoute]=useState(location.hash);
  useEffect(()=>{
    const update=()=>{
      const hash=location.hash;
      document.documentElement.classList.toggle("hide-booth-cursor", location.hostname !== "localhost" && hash !== "#/review");
      setRoute(hash);
    };
    update();
    window.addEventListener('hashchange',update);
    return()=>window.removeEventListener('hashchange',update);
  },[]);
  return <Suspense fallback={<p>Loading…</p>}>{route==='#/review'?<ReviewGallery/>:<LunarExperience/>}</Suspense>;
}
ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
