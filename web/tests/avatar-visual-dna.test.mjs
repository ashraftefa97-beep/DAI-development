import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { AVATAR_VISUAL_DNA, validateAvatarVisualDNA } from '../src/avatarVisualDNA.mjs';

const catalogText=fs.readFileSync(new URL('../src/avatarCatalog.ts',import.meta.url),'utf8');
const draw=fs.readFileSync(new URL('../src/draw.mjs',import.meta.url),'utf8');
const catalogIds=[...catalogText.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);

test('all 25 avatars have unique visual DNA',()=>{
  assert.equal(catalogIds.length,25);
  assert.deepEqual(validateAvatarVisualDNA(catalogIds),[]);
  assert.deepEqual(Object.keys(AVATAR_VISUAL_DNA).sort(),[...catalogIds].sort());

  const fingerprints=catalogIds.map(id=>{
    const dna=AVATAR_VISUAL_DNA[id];
    return [dna.eye,dna.mouth,dna.hand,dna.handMark,dna.signature].join('|');
  });
  assert.equal(new Set(fingerprints).size,25);
});

test('renderer uses structural avatar differences, not palette-only changes',()=>{
  assert.match(draw,/getAvatarVisualDNA/);
  assert.match(draw,/buildEyePath/);
  assert.match(draw,/handPathForStyle/);
  assert.match(draw,/drawHandMark/);
  assert.match(draw,/drawRestMouth/);
  assert.match(draw,/avatarSignatureVisual/);
  assert.match(draw,/dna\.eye/);
  assert.match(draw,/dna\.hand/);
  assert.match(draw,/dna\.mouth/);
  assert.match(draw,/dna\.signature/);
});
