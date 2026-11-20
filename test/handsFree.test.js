import test from 'node:test';
import assert from 'node:assert/strict';
import {createSmileGate} from '../src/experience/handsFree.js';
import {blurMask, blendMask} from '../src/experience/maskSmoothing.js';

test('waits for a stable group and sustained smiles from every guest',()=>{
  const gate=createSmileGate({settleMs:1000,smileMs:600});
  assert.equal(gate({scores:[]},0),'waiting');
  for(const t of [100,400,700]) assert.equal(gate({scores:[.9,.9]},t),'settling');
  assert.equal(gate({scores:[.9,.2]},1100),'smile');
  assert.equal(gate({scores:[.9,.9]},1400),'smile');
  assert.equal(gate({scores:[.9,.9]},1700),'smile');
  assert.equal(gate({scores:[.9,.9]},2000),'capture');
  assert.notEqual(gate({scores:[.9,.9]},2300),'capture');
});
test('a changed group or stalled video restarts settling',()=>{
  const gate=createSmileGate({settleMs:500,smileMs:400});
  gate({scores:[.9]},0); gate({scores:[.9]},500);
  assert.equal(gate({scores:[.9,.9]},800),'settling');
  gate({scores:[.9,.9]},1300);
  assert.equal(gate({scores:[.9,.9]},2500),'settling');
  assert.equal(gate({scores:[]},2600),'waiting');
});
test('mask blur preserves flat regions and feathers silhouette edges',()=>{
  assert.deepEqual([...blurMask(new Uint8Array(25).fill(255),5,5)],Array(25).fill(255));
  const mask=new Uint8Array(49); mask[24]=255;
  const result=blurMask(mask,7,7);
  assert.ok(result[24]<255 && result[24]>result[23]);
  assert.ok(result[23]>0); assert.equal(result[0],0);
});
test('temporal smoothing converges without overshoot and clears moving silhouettes quickly',()=>{
  const current=new Float32Array([120,255]), target=new Float32Array([140,0]), output=new Uint8Array(2);
  blendMask(current,target,output,16,160);
  assert.ok(output[0]>120 && output[0]<140);
  assert.ok(output[1]>0 && output[1]<220);
  for(let i=0;i<60;i++) blendMask(current,target,output,16,160);
  assert.equal(output[0],140); assert.equal(output[1],0);
});
