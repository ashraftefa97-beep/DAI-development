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
  assert.equal(plan.channels.stateFx,false);
  assert.equal(plan.channels.particles,false);
  assert.equal(plan.channels.hands,false);
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


test('state FX consumes the visual effect budget',()=>{
  for(const quality of ['high','medium','low']){
    const plan=createAnimationPlan(motion({
      quality,
      requestedGesture:'search',
      gesture:'search',
      state:'thinking'
    }));
    const decorative=['signatureFx','avatarFx','libraryFx'].filter(key=>plan.channels[key]).length;
    const total=decorative+(plan.channels.stateFx?1:0);
    const max=quality==='high'?3:quality==='medium'?2:1;
    assert.ok(total<=max,`${quality}: state FX exceeded total budget`);
    assert.deepEqual(validateAnimationPlan(plan),[]);
  }
});

test('particles are reserved for high-quality success moments',()=>{
  const search=createAnimationPlan(motion({quality:'high',requestedGesture:'search',gesture:'search'}));
  const mediumSuccess=createAnimationPlan(motion({quality:'medium',requestedGesture:'success',gesture:'success',state:'happy'}));
  const highSuccess=createAnimationPlan(motion({quality:'high',requestedGesture:'success',gesture:'success',state:'happy'}));
  assert.equal(search.channels.particles,false);
  assert.equal(mediumSuccess.channels.particles,false);
  assert.equal(highSuccess.channels.particles,true);
});


test('idle and listening stay visually restrained',()=>{
  const idle=createAnimationPlan(motion({quality:'high',requestedGesture:'idle',gesture:'idle'}));
  const idleDecorative=['signatureFx','avatarFx','libraryFx'].filter(key=>idle.channels[key]).length;
  assert.ok(idleDecorative<=1,'idle should not stack decorative FX');

  const listening=createAnimationPlan(motion({
    quality:'high',
    requestedGesture:'listen',
    gesture:'listen',
    state:'curious',
    pose:{listen:1,rod:0,wand:0,hat:0}
  }));
  assert.equal(listening.mode,'listening');
  assert.equal(listening.channels.stateFx,true);
  assert.equal(listening.overlays.listen,false);
  assert.equal(listening.overlays.thoughtDots,false);
  assert.deepEqual(validateAnimationPlan(listening),[]);
});

test('thinking uses avatar state FX instead of shared thought dots',()=>{
  const plan=createAnimationPlan(motion({
    quality:'high',
    requestedGesture:'thinking_deep',
    gesture:'thinking_deep',
    state:'thinking'
  }));
  assert.equal(plan.channels.stateFx,true);
  assert.equal(plan.overlays.thoughtDots,false);
  assert.deepEqual(validateAnimationPlan(plan),[]);
});


test('current gesture wins over stale pose residue',()=>{
  const search=createAnimationPlan(motion({
    requestedGesture:'search',
    gesture:'search',
    state:'thinking',
    pose:{listen:1,rod:0,wand:0,hat:0}
  }));
  assert.equal(search.mode,'searching');

  const working=createAnimationPlan(motion({
    requestedGesture:'working',
    gesture:'working',
    state:'thinking'
  }));
  assert.equal(working.mode,'working');
});

test('social wave does not masquerade as a success event',()=>{
  const wave=createAnimationPlan(motion({
    requestedGesture:'wave',
    gesture:'wave',
    state:'happy',
    quality:'high'
  }));
  assert.equal(wave.mode,'idle');
  assert.equal(wave.channels.stateFx,false);
  assert.equal(wave.channels.particles,false);
});
