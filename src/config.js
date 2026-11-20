const numberValue = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  brand: "riiffs",
  apiUrl: (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`).replace(/\/$/, ""),
  publicAppUrl: (import.meta.env.VITE_PUBLIC_APP_URL || `${window.location.origin}${import.meta.env.BASE_URL}`).replace(/\/$/, ""),
  title: import.meta.env.VITE_EXPERIENCE_TITLE || "RiiFFS Lunar Photobooth",
  kicker: import.meta.env.VITE_EXPERIENCE_KICKER || "RiiFFS / LUNAR ECLIPSE",
  countdownSeconds: numberValue(import.meta.env.VITE_COUNTDOWN_SECONDS, 3),
  generationTimeoutMs: numberValue(import.meta.env.VITE_GENERATION_TIMEOUT_MS, 30_000),
  resetDelayMs: numberValue(import.meta.env.VITE_RESET_DELAY_MS, 30_000),
};

export const defaultExperience = {
  labels: {
    styled: "Styled Portrait",
    original: "Source Portrait",
  },
  features: {
    animation: false,
    print: false,
  },
  modes: [
    { id: "lunar", label: "Lunar", description: "Lunar Pulse and Lunar Blush portraits.", color: "#2B83EE", developerOnly: false },
  ],
  riiffsStyles: [
    { id: "lunar-pulse", label: "Lunar Pulse", description: "Cobalt light, violet haze, and a full illuminated moon.", preview: `${import.meta.env.BASE_URL}riiffs/constellation-painter.png` },
    { id: "lunar-blush", label: "Lunar Blush", description: "Peach highlights, rose glass, and a violet lunar glow.", preview: `${import.meta.env.BASE_URL}riiffs/constellation-painter.png` },
  ],
};
