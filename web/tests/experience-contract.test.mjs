import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
const sfx=fs.readFileSync(new URL('../src/daiSfx.ts',import.meta.url),'utf8');
const motion=fs.readFileSync(new URL('../src/motion.mjs',import.meta.url),'utf8');

test('DAI core phase owns soundtrack and choreography',()=>{
  assert.match(app,/DAI_PHASE_SCENES/);
  assert.match(app,/daiSfx\.setScene\(/);
  assert.match(app,/phaseChoreographyTimersRef/);
  const start=app.indexOf('function transitionCorePhase');
  const end=app.indexOf('function animationSpecById',start);
  const block=app.slice(start,end);
  assert.doesNotMatch(block,/daiSfx\.playState\(/);
});

test('soundtrack engine has one ambient bed with scene crossfades',()=>{
  assert.match(sfx,/BED_PROFILE/);
  assert.match(sfx,/private ambience=new Howl/);
  assert.match(sfx,/setScene\(next:DaiSonicState/);
  assert.match(sfx,/refreshAmbience/);
  assert.match(sfx,/motionEventGain/);
});

test('motion system emits physical foley only',()=>{
  assert.match(motion,/Semantic\/UI sounds are intentionally NOT emitted by motion/);
  const semantic=motion.slice(motion.indexOf('// Semantic/UI sounds'));
  assert.doesNotMatch(semantic,/cross\([^\n]*'(?:bell|computer|glass)'/);
});
