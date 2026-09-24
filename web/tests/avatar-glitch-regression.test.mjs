import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { guardInterpolatedPose, poseHasFaceCollision } from '../src/poseGuard.mjs';
import { createAnimationPlan } from '../src/animationDirector.mjs';

const draw=fs.readFileSync(new URL('../src/draw.mjs',import.meta.url),'utf8');

test('interpolated hand poses cannot cross through the face',()=>{
  const pose={
    la:1,ra:1,
    lx:-32,ly:-6,
    rx:35,ry:-3,
    lr:-10,rr:10
  };
  guardInterpolatedPose(pose,{mode:'idle',reduced:false});
  assert.equal(poseHasFaceCollision(pose),false);
});

test('speaking transitions keep both hands clear of the mouth zone',()=>{
  const pose={
    la:1,ra:1,
    lx:-75,ly:-14,
    rx:72,ry:-18,
    lr:-12,rr:12
  };
  guardInterpolatedPose(pose,{mode:'speaking',reduced:false});
  assert.ok(pose.lx<=-92);
  assert.ok(pose.rx>=92);
  assert.ok(pose.ly>=22);
  assert.ok(pose.ry>=22);
});

test('renderer only grips tools approved by animation director',()=>{
  assert.match(draw,/plan\.accessory==='wand'&&q\.wand>\.3/);
  assert.match(draw,/plan\.accessory==='fishing'&&q\.rod>\.3/);
  assert.doesNotMatch(draw,/true,q\.wand>\.3/);
  assert.doesNotMatch(draw,/false,q\.rod>\.3/);
});

test('director FX intensity is consumed by signature and library rendering',()=>{
  assert.match(draw,/m\.animationPlan\?\.fxAlpha/);
  const serious=createAnimationPlan({
    requestedGesture:'idle',
    gesture:'idle',
    state:'idle',
    quality:'high',
    reduced:false,
    voiceDriven:true,
    voice:.8,
    speechMood:'serious',
    speechMoodIntensity:1,
    pose:{listen:0,rod:0,wand:0,hat:0}
  },{width:1200,height:700});
  assert.ok(serious.fxAlpha<1);
});
