import test from 'node:test';
import assert from 'node:assert/strict';
import {generationPresentation as present} from '../src/experience/generationPresentation.js';
test('progress captions follow the reported stage at any elapsed time',()=>{
  assert.equal(present('blush',90,'queued').caption,'Waiting for your turn');
  assert.equal(present('pulse',1,'finishing').caption,'Finishing your photo');
});
test('fragrances have distinct copy and a patient long-running message',()=>{
  for(const t of [0,8,16,26,45]) assert.notEqual(present('blush',t).message,present('pulse',t).message);
  assert.match(present('blush',60).message,/more time/);
  assert.match(present('pulse',60).message,/still/);
});
