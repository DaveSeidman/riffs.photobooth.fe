// Require sustained observations, never a single happy frame or a stale result.
export function createSmileGate({ settleMs = 1800, smileMs = 700, threshold = .55 } = {}) {
  let count = 0, since = 0, smilingSince = null, last = null, fired = false;
  return (sample, now) => {
    const n = sample.scores.length;
    if (last !== null && now - last > 700) { count = 0; smilingSince = null; fired = false; }
    last = now;
    if (!n || n !== count) { count = n; since = now; smilingSince = null; fired = false; }
    if (!n) return "waiting";
    if (now - since < settleMs) return "settling";
    if (sample.scores.some(score => score < threshold)) { smilingSince = null; return "smile"; }
    smilingSince ??= now;
    if (!fired && now - smilingSince >= smileMs) { fired = true; return "capture"; }
    return "smile";
  };
}
