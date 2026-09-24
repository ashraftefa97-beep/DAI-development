import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAnimationPlan,
  requestAnimationTransition,
  validateAnimationPlan
} from '../src/animationDirector.mjs';

function motion(overrides={}){
  return {
    requestedGesture:'idle',
    gesture:'idle',
    state:'idle',
    quality:'high',
    reduced:false,
    voiceDriven:false,
    voice:0,
    pose:{listen:0,rod:0,wand:0,hat:0},
    ...overrides
  };
}

test('director keeps speaking visually clean',()=>{
  const plan=createAnimationPlan(motion({
    requestedGesture:'talk',
    gesture:'talk',
    state:'talking',
    voiceDriven:true,
    voice:.7
  }));
  assert.equal(plan.mode,'speaking');
  assert.ok(plan.handScale<.5);
  const fx=['signatureFx','avatarFx','libraryFx'].filter(key=>plan.channels[key]);
  assert.ok(fx.length<=1);
  assert.equal(plan.channels.particles,false);
  assert.deepEqual(validateAnimationPlan(plan),[]);
});

test('director allows only one competing accessory',()=>{
  const plan=createAnimationPlan(motion({
    pose:{listen:0,rod:.72,wand:.93,hat:.41}
  }));
  assert.equal(plan.accessory,'wand');
  assert.equal(plan.channels.accessory,true);
});

test('reduced motion disables decorative FX and particles',()=>{
  const plan=createAnimationPlan(motion({reduced:true}));
  assert.equal(plan.channels.signatureFx,false);
  assert.equal(plan.channels.avatarFx,false);
  assert.equal(plan.channels.libraryFx,false);
  assert.equal(plan.channels.particles,false);
  assert.deepEqual(validateAnimationPlan(plan),[]);
});

test('error can interrupt any lower-priority animation',()=>{
  const result=requestAnimationTransition('talk','error',{
    now:1,
    lockedUntil:5,
    voiceActive:true
  });
  assert.equal(result.accept,true);
  assert.equal(result.mode,'error');
  assert.ok(result.lockMs>=600);
});

test('lower-priority animation waits during a lock',()=>{
  const result=requestAnimationTransition('success','idle',{
    now:1,
    lockedUntil:1.4,
    voiceActive:false
  });
  assert.equal(result.accept,false);
});

test('lower-priority animation resumes after a lock',()=>{
  const result=requestAnimationTransition('success','idle',{
    now:1.5,
    lockedUntil:1.4,
    voiceActive:false
  });
  assert.equal(result.accept,true);
});
