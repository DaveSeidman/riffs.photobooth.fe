const messages={
  blush:[
    'Your portrait is entering a world of rose and light.',
    'Soft pinks, luminous glass, and a little Blush magic.',
    'Your Lunar Blush portrait is taking shape.',
    'A softer world. A new side of you.',
    'Your Blush portrait needs a little more time. Stay in the glow.',
  ],
  pulse:[
    'Your portrait is heading into the Lunar universe.',
    'Cobalt light, cosmic depth, and your own electric energy.',
    'Your Lunar Pulse portrait is taking shape.',
    'Another world. Your unmistakable presence.',
    'Your Pulse portrait is still on its journey. Stay in orbit.',
  ],
};
export function generationPresentation(treatment,elapsed) {
  const mode=treatment==='blush'?'blush':'pulse';
  const seconds=Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  const index=seconds>=45?4:seconds>=26?3:seconds>=16?2:seconds>=8?1:0;
  // Time-based estimate only: the API returns a finished result, not stage progress.
  return {mode,message:messages[mode][index],progress:Math.min(94,8+86*(1-Math.exp(-seconds/18)))};
}
