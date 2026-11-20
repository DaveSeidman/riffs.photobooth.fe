export const glassDefaults = {
  model: "Lunar Blush",
  thickness: 0.28,
  ior: 1.4,
  roughness: 0.035,
  convexity: 0.12,
  bevel: 0.1,
  chromatic: 0.12,
  highlights: 1.6,
  speed: 0.14,
  rotation: -82,
  scale: 1.6,
  spinning: true,
  visible: true,
  tint: "#ffffff",
};
export function easeInOutQuad(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
}
