import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { DaiMotion } from '../src/motion.mjs';
import {
  AVATAR_BEHAVIOR_PROFILES,
  avatarAllowsLegacyAccessory,
  avatarAllowsHandGesture,
  getAvatarBehaviorProfile,
  validateAvatarBehaviorProfiles
} from '../src/avatarBehaviorRegistry.mjs';

const catalogText=fs.readFileSync(new URL('../src/avatarCatalog.ts',import.meta.url),'utf8');
const avatarIds=[...catalogText.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);

test('all 24 avatars own independent behavior profiles',()=>{
  assert.equal(avatarIds.length,24);
  assert.deepEqual(validateAvatarBehaviorProfiles(avatarIds),[]);
  assert.deepEqual(Object.keys(AVATAR_BEHAVIOR_PROFILES).sort(),[...avatarIds].sort());

  const motionFamilies=new Set();
  const visualSets={
    searchVisual:new Set(),
    listeningVisual:new Set(),
    thinkingVisual:new Set(),
    successVisual:new Set(),
    errorVisual:new Set()
  };
  for(const id of avatarIds){
    const profile=getAvatarBehaviorProfile(id);
    assert.ok(profile.motionFamily);
    assert.ok(!motionFamilies.has(profile.motionFamily),`${id}: reused motion family`);
    motionFamilies.add(profile.motionFamily);

    for(const [key,set] of Object.entries(visualSets)){
      assert.ok(profile[key],`${id}: missing ${key}`);
      assert.ok(!set.has(profile[key]),`${id}: reused ${key}`);
      set.add(profile[key]);
    }
  }
});

test('Classic alone owns legacy magic search props',()=>{
  for(const id of avatarIds){
    const expected=id==='classic';
    assert.equal(avatarAllowsLegacyAccessory(id,'hat','search'),expected,`${id}: hat search permission`);
    assert.equal(avatarAllowsLegacyAccessory(id,'wand','search'),expected,`${id}: wand search permission`);
    assert.equal(avatarAllowsHandGesture(id,'search'),expected,`${id}: search hand permission`);
  }
});

test('non-Classic search never inherits Classic hat wand or raised hand',()=>{
  for(const id of avatarIds.filter(value=>value!=='classic')){
    const motion=new DaiMotion(()=>.37);
    motion.setAvatar(id);
    motion.setGesture('search');
    motion.advance(.35);
    assert.ok((motion.pose.hat||0)<=.001,`${id}: inherited Classic hat`);
    assert.ok((motion.pose.wand||0)<=.001,`${id}: inherited Classic wand`);
    assert.ok((motion.pose.la||0)<=.01,`${id}: inherited Classic search left hand`);
    assert.ok((motion.pose.ra||0)<=.01,`${id}: inherited Classic search right hand`);
  }
});

test('Classic keeps its original magic-search identity',()=>{
  const motion=new DaiMotion(()=>.37);
  motion.setAvatar('classic');
  motion.setGesture('search');
  motion.advance(.35);
  assert.ok((motion.pose.hat||0)>.1);
  assert.ok((motion.pose.wand||0)>.1);
  assert.ok((motion.pose.la||0)>.05||(motion.pose.ra||0)>.05);
});

test('switching away from Classic clears all magic and hand state immediately',()=>{
  const motion=new DaiMotion(()=>.37);
  motion.setGesture('search');
  motion.advance(.25);
  assert.ok((motion.pose.hat||0)>.1||(motion.pose.wand||0)>.1);

  motion.setAvatar('cyber');
  assert.equal(motion.pose.hat,0);
  assert.equal(motion.pose.wand,0);
  assert.equal(motion.pose.rod,0);
  assert.equal(motion.pose.la,0);
  assert.equal(motion.pose.ra,0);
});

test('same search command produces meaningfully different real motion trajectories',()=>{
  const signatures=new Map();
  for(const id of avatarIds){
    const motion=new DaiMotion(()=>.37);
    motion.setAvatar(id);
    motion.setGesture('search');
    const samples=[];
    for(const dt of [.18,.22,.27,.31]){
      motion.advance(dt);
      samples.push([
        motion.pose.tilt,
        motion.pose.gaze_x,
        motion.pose.gaze_y,
        motion.pose.bob,
        motion.pose.sx,
        motion.pose.sy,
        motion.pose.la,
        motion.pose.ra,
        motion.pose.hat,
        motion.pose.wand
      ].map(value=>Math.round((Number(value)||0)*100)/100).join(','));
    }
    const sig=samples.join('|');
    assert.ok(!signatures.has(sig),`${id}: duplicates ${signatures.get(sig)} search trajectory`);
    signatures.set(sig,id);
  }
  assert.equal(signatures.size,24);
});


test('renderer uses the correct visual family for each state',()=>{
  const fx=fs.readFileSync(new URL('../src/avatarStateFx.mjs',import.meta.url),'utf8');
  assert.match(fx,/mode==='searching'\?profile\.searchVisual/);
  assert.match(fx,/mode==='thinking'\|\|mode==='working'\?profile\.thinkingVisual/);
  assert.match(fx,/mode==='success'\?profile\.successVisual/);
  assert.match(fx,/profile\.errorVisual/);
  assert.match(fx,/drawStateVisual\(c,mode,visual/);
});

test('idle motion is intentionally calmer than active motion',()=>{
  const draw=fs.readFileSync(new URL('../src/draw.mjs',import.meta.url),'utf8');
  assert.match(draw,/const activity=calm\?\.22:expressive\?1:\.62/);
});


test('avatar variant motion crossfades instead of snapping',()=>{
  const motionSource=fs.readFileSync(new URL('../src/motion.mjs',import.meta.url),'utf8');
  const drawSource=fs.readFileSync(new URL('../src/draw.mjs',import.meta.url),'utf8');

  assert.match(motionSource,/avatarPreviousVariantMotion/);
  assert.match(motionSource,/avatarVariantBlendStartedAt/);
  assert.match(motionSource,/avatarVariantBlendUntil/);
  assert.match(drawSource,/function avatarVariantBlend\(/);
  assert.match(drawSource,/previous\.dx\+\(current\.dx-previous\.dx\)\*blend/);
  assert.match(drawSource,/previous\.tilt\+\(current\.tilt-previous\.tilt\)\*blend/);
});


test('Classic search wand fades before the hand-intent window ends',()=>{
  const motion=new DaiMotion(()=>.37);
  motion.setAvatar('classic');
  motion.setGesture('search');
  motion.advance(.35);
  assert.ok((motion.pose.wand||0)>.1);
  motion.advance(2.35);
  assert.ok((motion.pose.wand||0)<.08,`wand stayed visible at ${motion.pose.wand}`);
  assert.ok((motion.pose.la||0)<.08,`search hand stayed visible at ${motion.pose.la}`);
  assert.ok((motion.pose.hat||0)>.1,'Classic should retain its search hat identity');
});


test('Classic scan detect and scout stay hand-free',()=>{
  for(const gesture of ['scan','detect','scout']){
    const motion=new DaiMotion(()=>.37);
    motion.setAvatar('classic');
    motion.setGesture(gesture);
    motion.advance(.35);
    assert.ok((motion.pose.hat||0)<=.01,`${gesture}: hat should not appear`);
    assert.ok((motion.pose.wand||0)<=.01,`${gesture}: wand should not appear`);
    assert.ok((motion.pose.la||0)<=.01,`${gesture}: left hand should stay hidden`);
    assert.ok((motion.pose.ra||0)<=.01,`${gesture}: right hand should stay hidden`);
  }
});
