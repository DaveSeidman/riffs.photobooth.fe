import test from 'node:test';
import assert from 'node:assert/strict';
import { easeInOutQuad } from '../src/glass/settings.js';

test('bottle movement eases quadratically into and out of its endpoint',()=>{
  assert.equal(easeInOutQuad(0),0);assert.equal(easeInOutQuad(1),1);
  assert.equal(easeInOutQuad(.25),.125);assert.equal(easeInOutQuad(.75),.875);
  assert.equal(easeInOutQuad(-1),0);assert.equal(easeInOutQuad(2),1);
  for(let i=0;i<=100;i++)assert.ok(Math.abs(easeInOutQuad(i/100)+easeInOutQuad(1-i/100)-1)<1e-10);
});
