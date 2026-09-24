import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { DaiMotion } from '../src/motion.mjs';
import { animationModeForMotion } from '../src/animationDirector.mjs';
import { AVATAR_ANIMATION_LIBRARIES } from '../src/avatarAnimations/index.mjs';

const avatarIds=Object.keys(AVATAR_ANIMATION_LIBRARIES);
const ACTIVE_GESTURES=['listen','thinking_deep','search','reply'];

function prepare(avatar,gesture){
  const motion=new DaiMotion(()=>.37);
  motion.nextBlink=999;
  motion.nextIdle=999;
  motion.setAvatar(avatar);
  motion.setGesture(gesture);
  return motion;
}

function runFor(motion,seconds,fps){
  const dt=1/fps;
  const frames=Math.round(seconds*fps);
  for(let i=0;i<frames;i++)motion.advance(dt);
  return motion;
}

function poseVector(motion){
  const p=motion.pose;
  return [
    p.left,p.right,p.smile,p.mouth,p.mouthWide,p.tilt,p.cheek,p.gaze_x,p.gaze_y,
    p.sx,p.sy,p.bob,p.la,p.ra,p.lx,p.ly,p.rx,p.ry,p.lr,p.rr,p.brow,p.listen,
    p.hat,p.wand,p.rod
  ].map(value=>Number(value)||0);
}

function meanDistance(a,b){
  let total=0;
  for(let i=0;i<a.length;i++){
    const weight=[13,14,15,16,17,18,19].includes(i)?.08:[9,10].includes(i)?28:1;
    total+=Math.abs(a[i]-b[i])*weight;
  }
  return total/a.length;
}

function faceDistance(a,b){
  const keys=['left','right','smile','mouth','mouthWide','tilt','cheek','gaze_x','gaze_y','sx','sy','bob','brow'];
  return keys.reduce((sum,key)=>{
    const av=Number(a[key])||0,bv=Number(b[key])||0;
    const weight=['sx','sy'].includes(key)?30:1;
    return sum+Math.abs(av-bv)*weight;
  },0)/keys.length;
}

test('animation timing stays consistent at 60 30 and 20 FPS across all avatars',()=>{
  for(const avatar of avatarIds){
    for(const gesture of ACTIVE_GESTURES){
      const p60=poseVector(runFor(prepare(avatar,gesture),3,60));
      const p30=poseVector(runFor(prepare(avatar,gesture),3,30));
      const p20=poseVector(runFor(prepare(avatar,gesture),3,20));

      assert.ok(meanDistance(p60,p30)<1.35,`${avatar}/${gesture}: 60 vs 30 FPS drifted`);
      assert.ok(meanDistance(p60,p20)<1.85,`${avatar}/${gesture}: 60 vs 20 FPS drifted`);
    }
  }
});

test('active semantic animation never changes itself during a 30 second state hold',()=>{
  for(const avatar of avatarIds){
    for(const gesture of ACTIVE_GESTURES){
      const motion=prepare(avatar,gesture);
      const initialVariant=motion.avatarVariantId;
      const initialGesture=motion.requestedGesture;
      for(let i=0;i<600;i++)motion.advance(.05);
      assert.equal(motion.requestedGesture,initialGesture,`${avatar}/${gesture}: semantic gesture drifted`);
      assert.equal(motion.avatarVariantId,initialVariant,`${avatar}/${gesture}: variant changed without state change`);
    }
  }
});

test('core-state transitions do not create a one-frame face jump',()=>{
  const transitions=[
    ['listen','thinking_deep'],
    ['thinking_deep','search'],
    ['search','reply'],
    ['reply','idle']
  ];

  for(const avatar of avatarIds){
    for(const [from,to] of transitions){
      const motion=prepare(avatar,from);
      runFor(motion,1.2,60);
      const before={...motion.pose};

      motion.setGesture(to);
      motion.advance(1/60);
      const after={...motion.pose};

      assert.equal(motion.requestedGesture,to,`${avatar}: ${from}->${to} did not follow state immediately`);
      assert.ok(
        faceDistance(before,after)<4.8,
        `${avatar}: ${from}->${to} face jumped too far in one frame (${faceDistance(before,after).toFixed(2)})`
      );
    }
  }
});

test('listening immediately interrupts an active speaking animation',()=>{
  for(const avatar of avatarIds){
    const motion=prepare(avatar,'talk');
    motion.setVoiceLevel(.8,true);
    motion.advance(.08);
    assert.equal(animationModeForMotion(motion),'speaking');

    motion.setGesture('listen');
    motion.advance(1/60);
    assert.equal(motion.requestedGesture,'listen');
    assert.equal(animationModeForMotion(motion),'listening');
  }
});

test('voice-driven mouth starts and stops promptly without hand leakage',()=>{
  for(const avatar of avatarIds){
    const motion=prepare(avatar,'talk');
    motion.setVoiceLevel(.82,true);
    motion.advance(.08);

    assert.ok((motion.pose.mouth||0)>.08,`${avatar}: mouth did not respond to voice quickly`);
    assert.ok((motion.pose.la||0)<=.01&& (motion.pose.ra||0)<=.01,`${avatar}: speaking leaked hand motion`);

    motion.setVoiceLevel(0,false);
    for(let i=0;i<8;i++)motion.advance(.02);
    assert.ok((motion.pose.mouth||0)<.08,`${avatar}: mouth stayed open after voice stopped`);
  }
});

test('switching semantic states clears incompatible props immediately',()=>{
  for(const avatar of avatarIds){
    const motion=prepare(avatar,'search');
    runFor(motion,.45,60);

    motion.setGesture('thinking_deep');
    motion.advance(1/60);

    assert.equal(motion.requestedGesture,'thinking_deep');
    assert.ok((motion.pose.wand||0)<=.01,`${avatar}: wand leaked into thinking`);
    assert.ok((motion.pose.rod||0)<=.01,`${avatar}: rod leaked into thinking`);
    assert.ok((motion.pose.hat||0)<=.08,`${avatar}: hat leaked into thinking`);
  }
});

test('simulation advances independently from render throttling in DaiFace',()=>{
  const face=fs.readFileSync(new URL('../src/DaiFace.tsx',import.meta.url),'utf8');
  const tick=face.slice(face.indexOf('const tick=(now:number)=>'),face.indexOf('const local=',face.indexOf('const tick=(now:number)=>')));
  assert.match(tick,/m\.advance\(dt\)/);
  assert.ok(tick.indexOf('m.advance(dt)')<tick.indexOf('if(!minFrameMs||now-lastDraw>=minFrameMs)'));
});

test('motion engine has no stale queued gesture system',()=>{
  const motion=fs.readFileSync(new URL('../src/motion.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(motion,/pendingGesture/);
});
