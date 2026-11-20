// A distance-proportional impulse on each axis. Exponential damping gives the
// same response at different frame rates and cannot overshoot a fixed target.
export function followTarget(position, target, delta, response = 4) {
  const impulse = 1 - Math.exp(-Math.max(0, response) * Math.max(0, Math.min(delta, .1)));
  position.x += (target.x - position.x) * impulse;
  position.y += (target.y - position.y) * impulse;
  position.z += (target.z - position.z) * impulse;
  return position;
}
