import test from 'node:test';
import assert from 'node:assert/strict';
import {followTarget} from '../src/glass/followTarget.js';
test('XYZ movement decelerates with remaining distance and never overshoots',()=>{
  const p={x:0,y:0,z:0},target={x:10,y:-4,z:2};
  let lastStep=Infinity;
  for(let i=0;i<120;i++){
    const before=p.x;followTarget(p,target,1/60);
    const step=p.x-before;assert.ok(step<=lastStep);lastStep=step;
    assert.ok(p.x<=10 && p.y>=-4 && p.z<=2);
  }
  assert.ok(p.x>9.99);
});
test('following is frame-rate independent and responds smoothly to a new target',()=>{
  const target={x:8,y:3,z:-2},a={x:0,y:0,z:0},b={...a};
  for(let i=0;i<30;i++)followTarget(a,target,1/30);
  for(let i=0;i<120;i++)followTarget(b,target,1/120);
  for(const axis of ['x','y','z'])assert.ok(Math.abs(a[axis]-b[axis])<1e-10);
  const old=a.x;followTarget(a,{x:-8,y:0,z:0},1/60);assert.ok(a.x<old && a.x>-8);
});
