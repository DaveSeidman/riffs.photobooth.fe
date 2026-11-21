// Face observations drive the same swept velocity/ink impulses as tracking's skeletons.
export const MAX_FLOW_POINTS = 4;
export class FaceFlow {
  constructor() { this.reset(); }
  reset() { this.previous=[]; this.observation=null; this.time=null; }
  sample(faces=[], time=0) {
    if (faces===this.observation) return [];
    const dt=this.time===null?0:time-this.time;
    const next=faces.slice(0,MAX_FLOW_POINTS).map(f=>({u:f.x+f.width/2,v:1-f.y-f.height/2}));
    const impulses=[];
    if(dt>0 && dt<.6 && next.length===this.previous.length) next.forEach((p,i)=>{
      const previous=this.previous[i], dx=p.u-previous.u, dy=p.v-previous.v;
      const distance=Math.hypot(dx,dy);
      if(distance<.002 || distance>.18) return;
      impulses.push({...p,fromU:previous.u,fromV:previous.v,dx:dx*.6,dy:dy*.6,pigment:i%2?.72:.3});
    });
    this.previous=next;this.observation=faces;this.time=time;
    return impulses;
  }
}
