import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { applyAvatarChoreography, AVATAR_CHOREOGRAPHY_DNA, validateAvatarChoreography } from '../src/avatarChoreography.mjs';

const catalogText=fs.readFileSync(new URL('../src/avatarCatalog.ts',import.meta.url),'utf8');
const avatarIds=[...catalogText.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);

function basePose(){
  return {
    left:.94,right:.94,lw:1,rw:1,smile:.3,mouth:0,tilt:0,cheek:.1,happy:0,
    gaze_x:0,gaze_y:0,sx:1,sy:1,bob:0,lx:-118,ly:72,rx:118,ry:72,la:0,ra:0,
    lr:-10,rr:10,mouthWide:0,hat:0,wand:0,listen:0,rod:0,fish:0,brow:0,
    heart:0,notes:0,bulb:0,sleep:0
  };
}

test('Classic is the only choreography profile',()=>{
  assert.deepEqual(avatarIds,['classic']);
  assert.deepEqual(Object.keys(AVATAR_CHOREOGRAPHY_DNA),['classic']);
  assert.deepEqual(validateAvatarChoreography(avatarIds),[]);
});

test('Classic choreography stays finite and subtle',()=>{
  for(const gesture of ['idle','voicewait','thinking_deep','working','search','found','talk']){
    for(const time of [.2,.8,1.6,2.4]){
      const p=basePose();
      applyAvatarChoreography(p,{
        avatarStyle:'classic',
        requestedGesture:gesture,
        gesture,
        avatarVariantSlot:'idle',
        avatarVariantId:'classic-idle-01',
        gestureTime:time,
        reduced:false
      });
      for(const key of ['tilt','gaze_x','gaze_y','bob','sx','sy','lx','ly','rx','ry','la','ra']){
        assert.ok(Number.isFinite(p[key]),gesture+': '+key+' is not finite');
      }
      assert.ok(Math.abs(p.tilt)<=18,gesture+': tilt escaped envelope');
      assert.ok(Math.abs(p.bob)<=18,gesture+': bob escaped envelope');
    }
  }
});

test('reduced motion removes Classic ambient choreography',()=>{
  const p=basePose();
  applyAvatarChoreography(p,{
    avatarStyle:'classic',
    requestedGesture:'idle',
    gesture:'idle',
    avatarVariantSlot:'idle',
    avatarVariantId:'classic-idle-01',
    gestureTime:1.2,
    reduced:true
  });
  assert.equal(p.bob,0);
  assert.equal(p.tilt,0);
});
