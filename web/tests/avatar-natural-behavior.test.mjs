import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { createAnimationPlan } from '../src/animationDirector.mjs';
import { DaiMotion } from '../src/motion.mjs';
import { applyNaturalHandPolicy } from '../src/poseGuard.mjs';
import { AVATAR_ANIMATION_LIBRARIES, chooseAvatarAnimation } from '../src/avatarAnimations/index.mjs';
import { animationSlotForGesture } from '../src/avatarAnimations/runtime.mjs';

test('idle and speaking keep hands fully at rest',()=>{
  const idlePose={la:1,ra:1,lx:-70,ly:10,rx:70,ry:10,lr:-30,rr:30};
  applyNaturalHandPolicy(idlePose,{mode:'idle',requestedGesture:'idle',activeGesture:'sleep'});
  assert.equal(idlePose.la,0);
  assert.equal(idlePose.ra,0);
  assert.equal(idlePose.lx,-118);
  assert.equal(idlePose.rx,118);

  const talkPose={la:.8,ra:.9,lx:-90,ly:20,rx:90,ry:20,lr:-10,rr:10};
  applyNaturalHandPolicy(talkPose,{mode:'speaking',requestedGesture:'reply',activeGesture:'reply'});
  assert.equal(talkPose.la,0);
  assert.equal(talkPose.ra,0);
});

test('listening never becomes an unnecessary two-hand pose',()=>{
  const pose={la:.9,ra:.8,lx:-110,ly:30,rx:110,ry:30,lr:-10,rr:10};
  applyNaturalHandPolicy(pose,{mode:'listening',requestedGesture:'listen',activeGesture:'listen'});
  const visible=[pose.la,pose.ra].filter(value=>value>.1);
  assert.ok(visible.length<=1);
  assert.ok(pose.la<=.78&&pose.ra<=.78);
});

test('animation director renders no hands during ambient idle or speaking',()=>{
  const idle=createAnimationPlan({
    requestedGesture:'idle',gesture:'breathe',state:'idle',quality:'high',reduced:false,
    voiceDriven:false,voice:0,speechMood:'neutral',speechMoodIntensity:.65,
    pose:{listen:0,rod:0,wand:0,hat:0}
  },{width:1200,height:700});
  const speaking=createAnimationPlan({
    requestedGesture:'reply',gesture:'reply',state:'talking',quality:'high',reduced:false,
    voiceDriven:true,voice:.7,speechMood:'warm',speechMoodIntensity:.7,
    pose:{listen:0,rod:0,wand:0,hat:0}
  },{width:1200,height:700});
  assert.equal(idle.handScale,0);
  assert.equal(speaking.handScale,0);
});

test('all generated library variants stay inside their semantic slot',()=>{
  for(const [avatar,library] of Object.entries(AVATAR_ANIMATION_LIBRARIES)){
    for(const [slot,variants] of Object.entries(library.slots)){
      for(const variant of variants){
        assert.equal(
          animationSlotForGesture(variant.gesture),
          slot,
          `${avatar}/${slot}: ${variant.gesture} escaped its semantic slot`
        );
      }
    }
  }
});

test('requested semantic gesture is preserved across every avatar',()=>{
  const requests=['question','wave','reply','scan','type_fast','error','sleep','approve'];
  for(const avatar of Object.keys(AVATAR_ANIMATION_LIBRARIES)){
    for(const requested of requests){
      const variant=chooseAvatarAnimation(avatar,requested,{random:()=>.37,allowSleepyIdle:false});
      assert.ok(variant,`${avatar}/${requested}: missing variant`);
      assert.equal(variant.gesture,requested,`${avatar}: changed requested ${requested} into ${variant.gesture}`);
    }
  }
});

test('ambient idle never sleeps or launches a large action before long inactivity',()=>{
  const blocked=new Set(['sleep','dream','yawn','meditate','stretch','side_stretch','roam_walk']);
  for(const avatar of Object.keys(AVATAR_ANIMATION_LIBRARIES)){
    for(let i=0;i<24;i++){
      const r=(i+.5)/24;
      const variant=chooseAvatarAnimation(avatar,'idle',{
        random:()=>r,
        allowSleepyIdle:false
      });
      assert.ok(variant,`${avatar}: missing idle variant`);
      assert.ok(!blocked.has(variant.gesture),`${avatar}: premature ambient ${variant.gesture}`);
      assert.ok(variant.durationMs>=4200,`${avatar}: idle changes too quickly (${variant.durationMs}ms)`);
    }
  }
});

test('explicit rest actions remain available when actually requested',()=>{
  for(const avatar of Object.keys(AVATAR_ANIMATION_LIBRARIES)){
    for(const gesture of ['sleep','dream','yawn','meditate','stretch']){
      const variant=chooseAvatarAnimation(avatar,gesture,{random:()=>.42,allowSleepyIdle:false});
      assert.ok(variant);
      assert.equal(variant.gesture,gesture);
    }
  }
});


test('real motion engine keeps head-only gestures hand-free across all avatars',()=>{
  const headOnly=['nod_yes','response_ready','approve','question','confused','thinking_deep','success','found','happy','sleep','relax'];
  for(const avatar of Object.keys(AVATAR_ANIMATION_LIBRARIES)){
    for(const gesture of headOnly){
      const motion=new DaiMotion(()=>.37);
      motion.setAvatar(avatar);
      motion.setGesture(gesture);
      motion.advance(.18);
      assert.ok((motion.pose.la||0)<=.01,`${avatar}/${gesture}: left hand remained visible (${motion.pose.la})`);
      assert.ok((motion.pose.ra||0)<=.01,`${avatar}/${gesture}: right hand remained visible (${motion.pose.ra})`);
    }
  }
});

test('intentional hand gestures are brief and return to rest automatically',()=>{
  for(const avatar of Object.keys(AVATAR_ANIMATION_LIBRARIES)){
    const motion=new DaiMotion(()=>.37);
    motion.setAvatar(avatar);
    motion.setGesture('wave');
    motion.advance(.28);
    assert.ok((motion.pose.la||0)>.01||(motion.pose.ra||0)>.01,`${avatar}: wave never showed a hand`);
    motion.advance(2.2);
    assert.ok((motion.pose.la||0)<=.01,`${avatar}: wave left hand stayed raised too long`);
    assert.ok((motion.pose.ra||0)<=.01,`${avatar}: wave right hand stayed raised too long`);
  }
});

test('animation plans keep head-only semantic reactions hand-free',()=>{
  const gestures=['nod_yes','response_ready','approve','question','confused','success','sleep'];
  for(const gesture of gestures){
    const plan=createAnimationPlan({
      requestedGesture:gesture,
      gesture,
      state:['approve','success'].includes(gesture)?'happy':gesture==='confused'?'confused':'idle',
      quality:'high',
      reduced:false,
      gestureTime:.4,
      voiceDriven:false,
      voice:0,
      speechMood:'neutral',
      speechMoodIntensity:.65,
      pose:{listen:0,rod:0,wand:0,hat:0}
    },{width:1200,height:700});
    assert.equal(plan.handScale,0,`${gesture}: render plan still allows hands`);
  }
});


test('renderer hard-gates hand draw calls even if pose alpha is stale',()=>{
  const draw=fs.readFileSync(new URL('../src/draw.mjs',import.meta.url),'utf8');
  assert.match(draw,/const handIntent=handIntentScale\(/);
  assert.match(draw,/alpha:q\.la\*plan\.handScale\*handIntent/);
  assert.match(draw,/alpha:q\.ra\*plan\.handScale\*handIntent/);
  assert.match(draw,/if\(handIntent>\.01&&plan\.handScale>\.01\)\{/);
});


test('long ambient idle never auto-selects hand or locomotion gestures',()=>{
  const blocked=new Set(['stretch','side_stretch','roam_walk']);
  for(const avatar of Object.keys(AVATAR_ANIMATION_LIBRARIES)){
    for(let i=0;i<32;i++){
      const r=(i+.25)/32;
      const variant=chooseAvatarAnimation(avatar,'idle',{
        random:()=>r,
        allowSleepyIdle:true
      });
      assert.ok(variant,`${avatar}: missing long-idle variant`);
      assert.ok(!blocked.has(variant.gesture),`${avatar}: automatic idle selected ${variant.gesture}`);
    }
  }
});
