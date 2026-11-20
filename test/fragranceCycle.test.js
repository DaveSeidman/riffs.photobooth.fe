import test from 'node:test';
import assert from 'node:assert/strict';
import {createFragranceCycle,advanceFragranceCycle,fragranceMix,swapPose} from '../src/glass/fragranceCycle.js';
test('30-second deadline queues the swap until the rear of the orbit',()=>{
  const s=createFragranceCycle();
  advanceFragranceCycle(s,29.9,{rear:1}); assert.equal(s.swapping,false);
  advanceFragranceCycle(s,.2,{rear:0}); assert.equal(s.swapping,false);
  advanceFragranceCycle(s,.1,{rear:.95}); assert.equal(s.swapping,true); assert.equal(s.to,'pulse');
  advanceFragranceCycle(s,.525,{rear:1}); assert.ok(Math.abs(fragranceMix(s)-.5)<1e-6);
  advanceFragranceCycle(s,.525,{rear:1}); assert.equal(s.current,'pulse'); assert.equal(s.elapsed,0);
  advanceFragranceCycle(s,30,{rear:1}); assert.equal(s.to,'blush');
});
test('capture pauses the timer but allows an already-started swap to finish',()=>{
  const s=createFragranceCycle('pulse');
  advanceFragranceCycle(s,40,{rear:1,paused:true}); assert.equal(s.elapsed,0);
  advanceFragranceCycle(s,30,{rear:1});
  advanceFragranceCycle(s,1.05,{rear:1,paused:true}); assert.equal(s.current,'blush'); assert.equal(s.swapping,false);
});
test('spiral swap lands precisely and keeps complementary scale throughout',()=>{
  for(let i=0;i<=20;i++) {
    const t=i/20,a=swapPose(t,false),b=swapPose(t,true);
    assert.ok(Math.abs(a.scale+b.scale-1)<1e-10);
    assert.ok(Math.abs(a.x+b.x)<1e-10);
  }
  assert.equal(swapPose(0,true).scale,0);assert.equal(swapPose(1,true).scale,1);
  const p=swapPose(.5,true,true);assert.equal(p.x,0);assert.equal(p.turn,0);
});
