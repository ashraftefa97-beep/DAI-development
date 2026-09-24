import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
const sfx=fs.readFileSync(new URL('../src/daiSfx.ts',import.meta.url),'utf8');
const motion=fs.readFileSync(new URL('../src/motion.mjs',import.meta.url),'utf8');
const draw=fs.readFileSync(new URL('../src/draw.mjs',import.meta.url),'utf8');
const avatarCatalog=fs.readFileSync(new URL('../src/avatarCatalog.ts',import.meta.url),'utf8');

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

test('core phase never delays the real DAI state behind animation locks',()=>{
  const start=app.indexOf('function transitionCorePhase');
  const end=app.indexOf('function animationSpecById',start);
  const block=app.slice(start,end);
  assert.doesNotMatch(app,/DAI_PHASE_PRIORITY/);
  assert.doesNotMatch(app,/DAI_PHASE_MIN_HOLD_MS/);
  assert.doesNotMatch(block,/animationLockUntilRef/);
  assert.match(block,/corePhaseRef\.current=phase/);
  assert.match(block,/setDaiState\(state\)/);
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


test('avatar system keeps all styles on the same motion engine',()=>{
  assert.match(app,/DaiAvatarStyle/);
  assert.match(app,/dai-avatar-style/);
  assert.match(app,/dai_preferences/);
  assert.match(app,/avatar=\{avatarStyle\}/);
  const catalogIds=[...avatarCatalog.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);
  const registry=draw.match(/DAI_AVATAR_STYLES=\[([^\]]+)\]/);
  assert.ok(registry);
  const drawIds=[...registry[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
  assert.equal(catalogIds.length,24);
  assert.equal(new Set(catalogIds).size,24);
  assert.deepEqual(drawIds,catalogIds);
  assert.match(draw,/avatarTheme/);
  assert.match(draw,/handTheme/);
  assert.match(draw,/AVATAR_MOTION_PROFILES/);
  assert.match(draw,/AVATAR_FACE_SHAPES/);
  assert.match(draw,/avatarFaceShape\(avatar\)/);
  assert.match(draw,/applyAvatarMotion\(c,m,avatar\)/);
  assert.match(draw,/stabilizeRenderedHands/);
  assert.match(draw,/hand\(c,renderedHands\.left\.x[^\n]*avatar\)/);
  assert.match(draw,/hand\(c,renderedHands\.right\.x[^\n]*avatar\)/);
  assert.match(draw,/export function drawDai\(c,m,w,h,avatar='classic'\)/);
});

test('avatar picker uses the central catalog and keyboard-safe radio behavior',()=>{
  for(const name of ['Classic DAI','Minimal','Cute','Cyber','Soft','Pro','Hologram','Sakura','Ocean','Solar','Midnight','Mint','Aurora','Ember','Rose Quartz','Ice','Neon Lime','Violet Pulse','Pearl','Crimson','Galaxy','Desert','Lavender','Matrix'])assert.ok(avatarCatalog.includes(name));
  assert.match(app,/DAI_AVATAR_OPTIONS\.map/);
  assert.match(app,/isDaiAvatarStyle/);
  assert.match(app,/role='radiogroup'/);
  assert.match(app,/tabIndex=\{avatarStyle===item\.id\?0:-1\}/);
  assert.match(app,/avatarKeyTarget/);
  assert.match(app,/data-avatar-choice=\{item\.id\}/);
  assert.match(app,/aria-live='polite'/);
});


test('core phase is the only automatic animation authority',()=>{
  assert.doesNotMatch(app,/behaviorCycleTimerRef/);
  assert.doesNotMatch(app,/contextAnimationWorthPlaying/);
  assert.doesNotMatch(app,/chooseContextAnimation/);
  assert.doesNotMatch(app,/sequence=\['search','scan','focus'\]/);
  assert.doesNotMatch(app,/ambient:\+state/);
  assert.match(app,/function transitionCorePhase/);
  assert.match(app,/semanticPhaseScene\(/);
});
