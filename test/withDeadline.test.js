import test from 'node:test';
import assert from 'node:assert/strict';
import {withDeadline} from '../src/experience/withDeadline.js';
test('stalled optional vision releases the flow with its fallback',async()=>{
  assert.equal(await withDeadline(()=>new Promise(()=>{}),15,2),2);
});
test('valid counts survive and rejected vision falls back',async()=>{
  assert.equal(await withDeadline(()=>Promise.resolve(3),50,1),3);
  assert.equal(await withDeadline(()=>Promise.reject(new Error('vision unavailable')),50,1),1);
});
