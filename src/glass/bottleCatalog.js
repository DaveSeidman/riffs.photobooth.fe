export const bottleModels = {
  "Lunar Blush / clear": { asset: "blush-clear", clear: true },
  "Lunar Pulse / clear": { asset: "pulse-clear", clear: true },
  "Lunar Blush": { asset: "blush", clear: false },
  "Lunar Pulse": { asset: "pulse", clear: false },
};
export const bottleOptions = [...Object.keys(bottleModels), "Octagon"];
export function bottleFor(name) {
  return bottleModels[name] || null;
}
