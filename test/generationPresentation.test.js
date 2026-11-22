import test from 'node:test';
import assert from 'node:assert/strict';
import {generationPresentation as present} from '../src/experience/generationPresentation.js';
test('generation estimate never claims completion, even on long requests',()=>{
  let previous=0;
  for(let t=0;t<180;t++) {const p=present('blush',t).progress;assert.ok(p>=previous && p<100);previous=p;}
  assert.equal(present('pulse',-10).progress,8);
});
test('fragrances have distinct copy and a patient long-running message',()=>{
  for(const t of [0,8,16,26,45]) assert.notEqual(present('blush',t).message,present('pulse',t).message);
  assert.match(present('blush',60).message,/more time/);
  assert.match(present('pulse',60).message,/still/);
});
