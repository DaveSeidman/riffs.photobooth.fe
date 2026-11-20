import React from "react";
import ReactDOM from "react-dom/client";
import LunarExperience from "./experience/LunarExperience.jsx";
import "./base.css";

// One application view. Retire old hash routes without reloading the camera.
if (location.hash) {
  const url = new URL(location.href);
  url.hash = "";
  history.replaceState(history.state, "", url);
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LunarExperience />
  </React.StrictMode>,
);
