export const glassDefaults = {
  model: "Lunar Blush",
  thickness: 0.13,
  backsideThickness: 3,
  clearcoatRoughness: 0.5,
  attenuationDistance: 14.7,
  distortion: 0.75,
  cameraEnvironmentStrength: 1.2,
  ior: 1.32,
  roughness: 0.05,
  convexity: 0.07,
  bevel: 0.07,
  chromatic: 0.2,
  highlights: 1.55,
  speed: 0.14,
  rotation: -82,
  scale: 1.57,
  spinning: true,
  visible: true,
  tint: "#ffffff",
};
export function easeInOutQuad(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
}
