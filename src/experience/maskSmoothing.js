// Dense separable Gaussian softening retains confidence and rounds small corners.
export function blurMask(bytes, width, height, radius = 2) {
  const horizontal = new Float32Array(bytes.length), result = new Float32Array(bytes.length);
  const r = Math.max(1, Math.min(10, Math.round(radius)));
  const sigma = Math.max(.8, r*.5);
  const weights = Array.from({length:r*2+1},(_,i)=>Math.exp(-((i-r)**2)/(2*sigma*sigma)));
  const total = weights.reduce((sum,w)=>sum+w,0);
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    let sum=0;
    for(let k=-r;k<=r;k++) sum += bytes[y*width+Math.max(0,Math.min(width-1,x+k))]*weights[k+r];
    horizontal[y*width+x]=sum/total;
  }
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    let sum=0;
    for(let k=-r;k<=r;k++) sum += horizontal[Math.max(0,Math.min(height-1,y+k))*width+x]*weights[k+r];
    result[y*width+x]=sum/total;
  }
  return result;
}
export function blendMask(current, target, output, dt, smoothingMs = 160) {
  const slow = 1-Math.exp(-dt/Math.max(1,smoothingMs));
  const fast = 1-Math.exp(-dt/55);
  for(let i=0;i<current.length;i++) {
    const difference=target[i]-current[i];
    const motion=Math.min(1,Math.max(0,(Math.abs(difference)-35)/100));
    current[i]+=difference*(slow+(fast-slow)*motion);
    output[i]=Math.round(current[i]);
  }
}
