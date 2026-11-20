export const smoothstep = t => { const x=Math.max(0,Math.min(1,t)); return x*x*(3-2*x); };
export function createFragranceCycle(initial = 'blush') {
  return {current:initial, from:initial, to:initial, elapsed:0, transition:0, swapping:false};
}
export function advanceFragranceCycle(state, dt, {rear, paused=false, enabled=true, interval=30, duration=1.05}={}) {
  if (!enabled || (paused && !state.swapping)) return state;
  if (state.swapping) {
    state.transition=Math.min(1,state.transition+dt/duration);
    if(state.transition===1) { state.current=state.to; state.swapping=false; state.elapsed=0; }
  } else {
    state.elapsed+=dt;
    if(state.elapsed>=interval && rear>=.94) {
      state.from=state.current; state.to=state.current==='blush'?'pulse':'blush';
      state.transition=0; state.swapping=true;
    }
  }
  return state;
}
export function fragranceMix(state) {
  if (!state.swapping) return state.current==='pulse'?1:0;
  const t=smoothstep(state.transition);
  return state.to==='pulse'?t:1-t;
}
export function swapPose(t, incoming, reduced=false) {
  const e=smoothstep(t), scale=incoming?e:1-e;
  const whip=Math.sin(Math.PI*e);
  const angle=e*Math.PI*2+(incoming?Math.PI:0);
  return {scale, x:reduced?0:Math.cos(angle)*whip*1.3, y:reduced?0:Math.sin(angle)*whip*.7,
    z:reduced?0:Math.sin(angle)*whip*.6, turn:reduced?0:(incoming?-(1-e):e)*Math.PI*2};
}
