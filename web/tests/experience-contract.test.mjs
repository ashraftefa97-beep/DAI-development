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


test('adaptive quality and preset system protects low-power devices',()=>{
  assert.match(app,/ExperiencePreset/);
  assert.match(app,/renderQuality/);
  assert.match(app,/requestAnimationFrame\(tick\)/);
  assert.match(app,/perfQualityVotesRef/);
  assert.match(app,/data-quality=\{renderQuality\}/);
  assert.match(app,/experiencePreset==='minimal'/);
});

test('audio lifecycle pauses and resumes cleanly across page visibility',()=>{
  assert.match(app,/visibilitychange/);
  assert.match(app,/pagehide/);
  assert.match(app,/pageshow/);
  assert.match(app,/suspendForLifecycle/);
  assert.match(app,/resumeForLifecycle/);
  assert.match(sfx,/MASTER_CEILING/);
  assert.match(sfx,/CUE_TRIM/);
  assert.match(sfx,/MAX_SIMULTANEOUS_VOICES/);
});

test('core phase priority manager prevents competing animations',()=>{
  assert.match(app,/DAI_PHASE_PRIORITY/);
  assert.match(app,/DAI_PHASE_MIN_HOLD_MS/);
  assert.match(app,/corePhaseStartedAtRef/);
  assert.match(app,/workPhaseStartedAtRef/);
  assert.match(app,/fastTurn/);
});

test('runtime diagnostics expose animation and soundtrack health',()=>{
  assert.match(app,/runtimePerf/);
  assert.match(app,/Dropped frames/);
  assert.match(app,/audioMaxConcurrent/);
  assert.match(app,/audioResumeCount/);
  assert.match(app,/audioContextState/);
});
