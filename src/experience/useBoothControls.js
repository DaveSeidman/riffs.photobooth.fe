import { useEffect, useState } from "react";
import { button, folder, useControls } from "leva";
import { bottleOptions } from "../glass/bottleCatalog.js";
import { glassDefaults } from "../glass/settings.js";

export function useBoothControls() {
  const [visible, setVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState("auto");
  const [cameraReset, setCameraReset] = useState(0);
  useEffect(() => {
    const toggle = (event) => {
      if ((event.key !== "F1" && event.code !== "F1") || event.repeat) return;
      event.preventDefault();
      event.stopPropagation();
      setVisible((value) => !value);
    };
    window.addEventListener("keydown", toggle, true);
    return () => window.removeEventListener("keydown", toggle, true);
  }, []);
  const values = useControls({
    Camera: folder({
      orbit: { value: true, label: "Orbit controls" },
      orbitPan: { value: true, label: "Allow pan" },
      orbitZoom: { value: true, label: "Allow zoom" },
      "Reset camera": button(() => setCameraReset((n) => n + 1)),
      "Save framing": button(() => window.dispatchEvent(new Event("lunar:save-framing"))),
    }),
    "Fragrance background": folder({
      autoFragranceCycle: { value: true, label: "Auto Blush / Pulse" },
      fragranceCycleSeconds: { value: 30, min: 10, max: 120, step: 5, label: "Switch after (sec)" },
      fragranceBackground: { value: true, label: "Animated backdrop" },
      backgroundStyle: { value: "bottle", options: { "Follow bottle": "bottle", "Blush / pink swirls": "blush", "Pulse / starscape": "pulse" }, label: "World" },
      backgroundGap: { value: 24, min: 0, max: 80, step: 1, label: "Clear gap (px)" },
      backgroundOpacity: { value: .75, min: 0, max: 1, step: .05, label: "Background opacity" },
      backgroundSpeed: { value: 1, min: 0, max: 2, step: .05, label: "Motion speed" },
    }, {collapsed:true}),
    "Heads & light": folder({
      segmentation: { value: true, label: "Person mask" },
      neonOutline: { value: true, label: "Neon silhouette" },
      outlineColor: { value: "#ff19bd", label: "Blush neon" },
      pulseOutlineColor: { value: "#00cfff", label: "Pulse neon" },
      outlineStrength: { value: 1.8, min: 0, max: 3, step: .1, label: "Neon glow" },
      outlineOffset: { value: 10, min: 0, max: 40, step: 1, label: "Outline offset (px)" },
      outlineWidth: { value: 1.5, min: .5, max: 8, step: .25, label: "Outline width" },
      showMask: { value: false, label: "Show mask" },
      positionFollow: { value: 4, min: .5, max: 12, step: .25, label: "Position follow" },
      headOrbit: { value: true, label: "Orbit heads" },
      headOrbitMoving: { value: true, label: "Orbit motion" },
      headOrbitSpeed: { value: .4, min: 0, max: 2, step: .01, label: "Orbit speed" },
      headOrbitPhase: { value: 0, min: -180, max: 180, step: 1, label: "Orbit angle" },
      headOrbitRadius: { value: 1.6, min: .3, max: 5, step: .05, label: "Orbit radius" },
      headOrbitDepth: { value: 1.6, min: .3, max: 3, step: .05, label: "Orbit depth" },
      headOrbitLift: { value: .1, min: -3, max: 3, step: .05, label: "Orbit height" },
      headOrbitScale: { value: .3, min: .05, max: 1.5, step: .01, label: "Orbit bottle scale" },
      relight: { value: true, label: "Relight people" },
      relightStrength: { value: 1.6, min: 0, max: 6, step: .05, label: "Light strength" },
      relightAmbient: { value: .8, min: 0, max: 1.5, step: .05, label: "Ambient light" },
      relightReach: { value: 4, min: .5, max: 10, step: .1, label: "Light reach" },
      relightRim: { value: 1.2, min: 0, max: 4, step: .1, label: "Rim light" },
      relightRimWidth: { value: 1.5, min: .25, max: 8, step: .25, label: "Rim width" },
      relightColor: { value: "#ff9fce", label: "Front colour" },
      relightBackColor: { value: "#8b80ff", label: "Back colour" },
      backgroundBrightness: { value: .45, min: 0, max: 1, step: .01, label: "Background light" },
      maskBlur: { value: 4, min: 1, max: 10, step: 1, label: "Mask edge blur" },
      maskSmoothingMs: { value: 160, min: 0, max: 400, step: 10, label: "Mask smoothing (ms)" },
      maskThreshold: { value: .5, min: .1, max: .9, step: .01, label: "Mask threshold" },
      maskSoftness: { value: .24, min: .01, max: .45, step: .01, label: "Mask softness" },
    }, {collapsed:true}),
    "Model position": folder({
      positionX: { value: 0, min: -5, max: 5, step: 0.01, label: "X / left–right" },
      positionY: { value: 0, min: -5, max: 5, step: 0.01, label: "Y / up–down" },
      positionZ: { value: 0, min: -5, max: 4, step: 0.01, label: "Z / depth" },
    }),
    Postprocessing: folder({
      postprocessing: { value: true, label: "Enable effects" },
      dof: { value: true, label: "Depth of field" },
      focusDistance: { value: 8, min: 0.1, max: 20, step: 0.05, label: "Focus distance" },
      focusRange: { value: 2, min: 0.05, max: 10, step: 0.05, label: "Focus range" },
      bokehScale: { value: 2, min: 0, max: 10, step: 0.1, label: "Bokeh / blur" },
      bloom: { value: true, label: "Highlight bloom" },
      bloomIntensity: { value: 0.2, min: 0, max: 3, step: 0.01, label: "Bloom strength" },
      bloomThreshold: { value: 1, min: 0, max: 3, step: 0.01, label: "Bloom threshold" },
      bloomSmoothing: { value: 0.15, min: 0.01, max: 1, step: 0.01, label: "Bloom softness" },
      vignette: { value: 0.15, min: 0, max: 1, step: 0.01, label: "Vignette" },
    }),
    "Glass shader": folder({
      model: {
        value: glassDefaults.model,
        options: bottleOptions.filter(name => !name.endsWith(" / clear")),
        label: "Glass / bottle",
      },
      visible: { value: glassDefaults.visible, label: "Show bottle" },
      transmission: { value: 1, min: 0, max: 1, step: 0.01 },
      backside: { value: true, label: "Render back face" },
      backsideThickness: {
        value: glassDefaults.backsideThickness,
        min: 0,
        max: 3,
        step: 0.01,
        label: "Back thickness",
      },
      clearcoat: { value: 1, min: 0, max: 1, step: 0.01 },
      clearcoatRoughness: {
        value: 0.035,
        min: 0,
        max: 0.5,
        step: 0.005,
        label: "Coat roughness",
      },
      attenuationDistance: {
        value: 4,
        min: 0.1,
        max: 20,
        step: 0.1,
        label: "Tint depth",
      },
      distortion: { value: 0, min: 0, max: 1, step: 0.01 },
      thickness: { value: glassDefaults.thickness, min: 0, max: 5, step: 0.01 },
      ior: {
        value: glassDefaults.ior,
        min: 1,
        max: 2.3,
        step: 0.01,
        label: "Refraction",
      },
      roughness: {
        value: glassDefaults.roughness,
        min: 0,
        max: 0.4,
        step: 0.01,
      },
      convexity: {
        value: glassDefaults.convexity,
        min: 0,
        max: 0.25,
        step: 0.01,
      },
      bevel: {
        value: glassDefaults.bevel,
        min: 0.015,
        max: 0.18,
        step: 0.005,
        label: "Edge rounding",
      },
      scale: { value: glassDefaults.scale, min: 0.4, max: 2, step: 0.01 },
      tint: { value: glassDefaults.tint, label: "Glass tint" },
    }),
    Light: folder({
      cameraEnvironment: { value: true, label: "Camera reflections" },
      cameraEnvironmentStrength: { value: .8, min: 0, max: 2, step: .05, label: "Camera light" },
      highlights: {
        value: glassDefaults.highlights,
        min: 0,
        max: 4,
        step: 0.05,
      },
      chromatic: {
        value: glassDefaults.chromatic,
        min: 0,
        max: 0.2,
        step: 0.01,
        label: "Colour separation",
      },
    }),
    "Floating shimmer": folder(
      {
        sparkles: { value: true, label: "Show sparkles" },
        sparkleSize: {
          value: 0.045,
          min: 0.01,
          max: 0.12,
          step: 0.005,
          label: "Size",
        },
        sparkleOpacity: {
          value: 0.8,
          min: 0,
          max: 1,
          step: 0.05,
          label: "Brightness",
        },
        sparkleFollow: {
          value: 1.8,
          min: 0.2,
          max: 8,
          step: 0.1,
          label: "Rotation follow",
        },
      },
      { collapsed: true },
    ),
    Movement: folder({
      spinning: { value: true, label: "Keep rotating" },
      speed: { value: glassDefaults.speed, min: 0, max: 1, step: 0.01 },
      rotation: {
        value: glassDefaults.rotation,
        min: -180,
        max: 180,
        step: 1,
        label: "Y rotation",
      },
      moveDuration: {
        value: 1.4,
        min: 0.2,
        max: 3,
        step: 0.1,
        label: "Recede duration",
      },
    }),
  });
  return {
    visible,
    previewMode,
    setPreviewMode,
    toggle: () => setVisible((value) => !value),
    settings: { ...values, model: values.model?.replace(" / clear", ""), cameraReset,
      ...(previewMode === "auto" ? {} : {model:previewMode === "pulse" ? "Lunar Pulse" : "Lunar Blush", backgroundStyle:previewMode, autoFragranceCycle:false}),
    },
  };
}
