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

function signature(p){
  const keys=['tilt','gaze_x','gaze_y','bob','lx','ly','rx','ry','la','ra','lr','rr','sx','sy','smile','cheek','brow'];
  return keys.map(key=>Math.round((Number(p[key])||0)*10)/10).join('|');
}

test('every avatar owns a unique core choreography motif',()=>{
  assert.equal(avatarIds.length,24);
  assert.deepEqual(validateAvatarChoreography(avatarIds),[]);
  assert.deepEqual(Object.keys(AVATAR_CHOREOGRAPHY_DNA).sort(),[...avatarIds].sort());
});

test('same semantic state produces 24 visibly different core poses',()=>{
  const signatures=new Map();
  for(const id of avatarIds){
    const p=basePose();
    applyAvatarChoreography(p,{
      avatarStyle:id,
      avatarVariantSlot:'thinking',
      avatarVariantId:`${id}-thinking-07`,
      gestureTime:1.37,
      reduced:false
    });
    const sig=signature(p);
    assert.ok(!signatures.has(sig),`${id} duplicates ${signatures.get(sig)} core pose`);
    signatures.set(sig,id);
  }
  assert.equal(signatures.size,24);
});

test('each avatar idle library drives several different core poses, not palette-only variants',()=>{
  for(const id of avatarIds){
    const poses=new Set();
    for(let index=1;index<=16;index++){
      const p=basePose();
      applyAvatarChoreography(p,{
        avatarStyle:id,
        avatarVariantSlot:'idle',
        avatarVariantId:`${id}-idle-${String(index).padStart(2,'0')}`,
        gestureTime:1.11,
        reduced:false
      });
      poses.add(signature(p));
    }
    assert.ok(poses.size>=8,`${id}: only ${poses.size} visibly distinct idle core poses`);
  }
});

test('non-classic avatars are not just classic with tiny numeric drift',()=>{
  const classic=basePose();
  applyAvatarChoreography(classic,{
    avatarStyle:'classic',
    avatarVariantSlot:'success',
    avatarVariantId:'classic-success-05',
    gestureTime:1.4,
    reduced:false
  });
  const keys=['tilt','gaze_x','gaze_y','bob','lx','ly','rx','ry','la','ra','lr','rr'];
  for(const id of avatarIds.filter(x=>x!=='classic')){
    const p=basePose();
    applyAvatarChoreography(p,{
      avatarStyle:id,
      avatarVariantSlot:'success',
      avatarVariantId:`${id}-success-05`,
      gestureTime:1.4,
      reduced:false
    });
    const distance=keys.reduce((sum,key)=>sum+Math.abs((Number(p[key])||0)-(Number(classic[key])||0)),0);
    assert.ok(distance>8,`${id}: core choreography remains too close to classic (${distance.toFixed(2)})`);
  }
});
