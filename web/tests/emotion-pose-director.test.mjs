import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveEmotion, applyEmotionToPose, validateEmotionProfile } from '../src/emotionDirector.mjs';
import { guardPose, poseHasFaceCollision } from '../src/poseGuard.mjs';
import { createAnimationPlan, validateAnimationPlan } from '../src/animationDirector.mjs';

function motion(overrides={}){
  return {
    requestedGesture:'idle',
    gesture:'idle',
    state:'idle',
    quality:'high',
    reduced:false,
    voiceDriven:false,
    voice:0,
    speechMood:'neutral',
    speechMoodIntensity:.65,
    pose:{listen:0,rod:0,wand:0,hat:0},
    ...overrides
  };
}

test('emotion profiles are valid and produce distinct energy',()=>{
  assert.deepEqual(validateEmotionProfile(),[]);
  const calm=resolveEmotion(motion({speechMood:'calm',voiceDriven:true,voice:.8,speechMoodIntensity:1}));
  const happy=resolveEmotion(motion({speechMood:'happy',voiceDriven:true,voice:.8,speechMoodIntensity:1}));
  assert.ok(calm.energy<happy.energy);
  assert.ok(calm.fx<happy.fx);
});

test('emotion director modifies pose without replacing gesture semantics',()=>{
  const p={smile:.2,cheek:.1,tilt:0,gaze_y:0,brow:0,la:.8,ra:.8,bob:2};
  applyEmotionToPose(p,motion({speechMood:'happy',voiceDriven:true,voice:.7,speechMoodIntensity:1}));
  assert.ok(p.smile>.2);
  assert.ok(p.cheek>.1);
  assert.ok(p.bob>2);
});

test('pose guard keeps visible hands outside face zone',()=>{
  const p={la:1,ra:1,lx:-24,ly:-12,rx:28,ry:-8,lr:-10,rr:10};
  assert.equal(poseHasFaceCollision(p),true);
  guardPose(p,{mode:'idle',reduced:false});
  assert.equal(poseHasFaceCollision(p),false);
});

test('speaking pose guard keeps hands away from mouth',()=>{
  const p={la:1,ra:1,lx:-60,ly:-30,rx:60,ry:-30,lr:-10,rr:10};
  guardPose(p,{mode:'speaking',reduced:false});
  assert.ok(p.lx<=-88);
  assert.ok(p.rx>=88);
  assert.ok(p.ly>=18);
  assert.ok(p.ry>=18);
  assert.ok(p.la<1||p.ra<1);
});

test('adaptive motion density drops for compact speaking scenes',()=>{
  const desktop=createAnimationPlan(motion(),{width:1200,height:700});
  const compactSpeaking=createAnimationPlan(motion({
    requestedGesture:'talk',
    gesture:'talk',
    state:'talking',
    voiceDriven:true,
    voice:.7
  }),{width:390,height:720});
  assert.ok(compactSpeaking.motionDensity<desktop.motionDensity);
  assert.ok(compactSpeaking.handScale<desktop.handScale);
  assert.deepEqual(validateAnimationPlan(desktop),[]);
  assert.deepEqual(validateAnimationPlan(compactSpeaking),[]);
});

test('serious mood reduces decorative intensity',()=>{
  const neutral=createAnimationPlan(motion({speechMood:'neutral'}),{width:1200,height:700});
  const serious=createAnimationPlan(motion({
    speechMood:'serious',
    voiceDriven:true,
    voice:.8,
    speechMoodIntensity:1
  }),{width:1200,height:700});
  assert.ok(serious.fxAlpha<neutral.fxAlpha);
});
