import test from 'node:test';
import assert from 'node:assert/strict';
import {FaceFlow} from '../src/glass/fluid/face-flow.js';
const face=x=>[{x,y:.3,width:.15,height:.2}];
test('fluid consumes each detection once and follows observed motion',()=>{
  const flow=new FaceFlow(), first=face(.2), second=face(.24);
  assert.deepEqual(flow.sample(first,1),[]);
  const [impulse]=flow.sample(second,1.15);
  assert.ok(impulse.dx>0);
  assert.equal(impulse.dy,0);
  assert.deepEqual(flow.sample(second,1.16),[]);
});
test('fluid ignores jitter, reacquisition and jumps between people',()=>{
  const flow=new FaceFlow();flow.sample(face(.2),1);
  assert.deepEqual(flow.sample(face(.2001),1.15),[]);
  assert.deepEqual(flow.sample(face(.8),1.3),[]);
  assert.deepEqual(flow.sample(face(.82),2.5),[]);
  flow.reset();assert.deepEqual(flow.sample(face(.3),3),[]);
});
