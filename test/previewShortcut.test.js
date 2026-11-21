import test from 'node:test';
import assert from 'node:assert/strict';
import {previewShortcut} from '../src/experience/previewShortcut.js';
test('mode shortcuts accept either key case and keycode fallback',()=>{
  assert.equal(previewShortcut({key:'B'}),'blush');
  assert.equal(previewShortcut({key:'p'}),'pulse');
  assert.equal(previewShortcut({code:'KeyA'}),'auto');
  assert.equal(previewShortcut({key:'x'}),null);
});
test('mode shortcuts preserve typing and browser shortcuts',()=>{
  for(const extra of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{target:{tagName:'INPUT'}},{target:{isContentEditable:true}}])
    assert.equal(previewShortcut({key:'b',...extra}),null);
  assert.equal(previewShortcut({key:'b',target:{tagName:'BUTTON'}}),'blush');
});
