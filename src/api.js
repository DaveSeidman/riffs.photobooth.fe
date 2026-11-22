import { logEvent } from "./lib/logger.js";
import { timers } from "./lib/timers.js";
import { appConfig, defaultExperience } from "./config.js";

async function parseResponse(response) {
  const payload = await response.json().catch((error) => {
    logEvent("fetch.parse-failed", { url: response.url, error }, "error");
    return {};
  });
  logEvent("fetch.payload", {
    url: response.url,
    status: response.status,
    payload,
  });
  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status}).`);
  }
  return payload;
}

export async function fetchExperience() {
  try {
    const response = await fetch(`${appConfig.apiUrl}/config`);
    const payload = await parseResponse(response);
    return {
      ...defaultExperience,
      ...payload,
      modes: payload.modes || defaultExperience.modes,
      lunarStyles: (payload.lunarStyles || defaultExperience.riiffsStyles).map(
        (style) => ({
          ...defaultExperience.riiffsStyles.find(
            (fallback) => fallback.id === style.id,
          ),
          ...style,
        }),
      ),
      riiffsStyles: (
        payload.riiffsStyles || defaultExperience.riiffsStyles
      ).map((style) => ({
        ...defaultExperience.riiffsStyles.find(
          (fallback) => fallback.id === style.id,
        ),
        ...style,
      })),
      labels: { ...defaultExperience.labels, ...payload.labels },
      features: { ...defaultExperience.features, ...payload.features },
    };
  } catch (error) {
    logEvent("experience.fallback", { error }, "warn");
    return defaultExperience;
  }
}

async function generationRequestBudget() {
  const controller = new AbortController();
  const timeout = timers.setTimeout(() => controller.abort(), 2500);
  let fallbackAfterMs = 34000;
  try {
    // Refresh the learned deadline for each capture, including long-running kiosks.
    const response = await fetch(`${appConfig.apiUrl}/config`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.ok) {
      const payload = await parseResponse(response);
      if (
        Number.isFinite(payload.generation?.fallbackAfterMs) &&
        payload.generation.fallbackAfterMs > 0
      )
        fallbackAfterMs = payload.generation.fallbackAfterMs;
    }
  } catch {
    /* The local backend can still handle a capture if this config lookup fails. */
  } finally {
    timers.clearTimeout(timeout);
  }
  return Math.max(appConfig.generationTimeoutMs, fallbackAfterMs + 15000);
}

export async function submitPhoto(
  photo,
  {
    mode = "lunar",
    style,
    promptOverride,
    failureSimulation = "none",
    portraitContext,
    onProgress,
    signal,
  } = {},
) {
  const timeoutMs =
    style === "dramatic-pose" ? 150000 : await generationRequestBudget();
  const controller = new AbortController();
  const timeout = timers.setTimeout(() => {
    logEvent("generation.timeout", { timeoutMs }, "warn");
    controller.abort();
  }, timeoutMs);
  const form = new FormData();
  form.append("photo", photo, "photo.jpg");
  form.append("mode", mode);
  if (style) form.append("style", style);
  if (portraitContext)
    form.append("portraitContext", JSON.stringify(portraitContext));
  if (failureSimulation !== "none") {
    form.append("failureSimulation", failureSimulation);
    logEvent("generation.simulation-requested", { failureSimulation });
  }
  if (promptOverride?.trim())
    form.append("promptOverride", promptOverride.trim());

  const progressId = onProgress && globalThis.crypto?.randomUUID?.();
  let pollTimer;
  const pollSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;
  if (progressId) {
    form.append("progressId", progressId);
    const poll = async () => {
      try {
        const response = await fetch(`${appConfig.apiUrl}/api/generation-progress/${progressId}`, { signal: pollSignal });
        if (response.ok) {
          const { stage } = await response.json();
          if (stage && !pollSignal.aborted) onProgress(stage);
        }
      } catch { /* The portrait request can finish even if a status update fails. */ }
      if (!pollSignal.aborted) pollTimer = timers.setTimeout(poll, 1000);
    };
    pollTimer = timers.setTimeout(poll, 700);
  }
  try {
    const response = await fetch(`${appConfig.apiUrl}/submit`, {
      method: "POST",
      body: form,
      signal: signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal,
    });
    return await parseResponse(response);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The booth could not finish the portrait. Check the connection to the booth computer and try again.",
      );
    }
    throw error;
  } finally {
    controller.abort();
    timers.clearTimeout(pollTimer);
    timers.clearTimeout(timeout);
  }
}

export function photoUrl(photoId, extension = "jpg") {
  return `${appConfig.apiUrl}/photos/${photoId}.${extension}`;
}

export function takeawayUrl(photoId) {
  const url = new URL(appConfig.publicAppUrl);
  url.searchParams.delete("brand");
  url.hash = `/takeaway/${photoId}`;
  return url.toString();
}

export const assetUrl = (value) =>
  value?.startsWith("/") ? `${appConfig.apiUrl}${value}` : value;
