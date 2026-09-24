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


function trajectorySignature(id,slotName,variant=7){
  const times=[.31,.78,1.37,2.08,2.91];
  return times.map(time=>{
    const p=basePose();
    applyAvatarChoreography(p,{
      avatarStyle:id,
      avatarVariantSlot:slotName,
      avatarVariantId:`${id}-${slotName}-${String(variant).padStart(2,'0')}`,
      gestureTime:time,
      reduced:false
    });
    return signature(p);
  }).join('>>');
}

test('all semantic slots produce 24 distinct avatar trajectories over time',()=>{
  const slots=['idle','listening','thinking','searching','speaking','success','error'];
  for(const slotName of slots){
    const seen=new Map();
    for(const id of avatarIds){
      const sig=trajectorySignature(id,slotName,slotName==='speaking'?5:7);
      assert.ok(!seen.has(sig),`${slotName}: ${id} duplicates ${seen.get(sig)} trajectory`);
      seen.set(sig,id);
    }
    assert.equal(seen.size,24,`${slotName}: expected 24 unique trajectories`);
  }
});

test('each avatar has meaningfully different trajectories across semantic slots',()=>{
  const slots=['idle','listening','thinking','searching','speaking','success','error'];
  for(const id of avatarIds){
    const signatures=new Set(slots.map(slotName=>trajectorySignature(id,slotName,slotName==='speaking'?5:7)));
    assert.equal(signatures.size,slots.length,`${id}: semantic slots collapse into repeated trajectories`);
  }
});

test('core choreography remains inside a sane pre-guard motion envelope',()=>{
  const slots=['idle','listening','thinking','searching','speaking','success','error'];
  for(const id of avatarIds){
    for(const slotName of slots){
      for(const time of [.25,.75,1.4,2.2,3.1]){
        const p=basePose();
        applyAvatarChoreography(p,{
          avatarStyle:id,
          avatarVariantSlot:slotName,
          avatarVariantId:`${id}-${slotName}-07`,
          gestureTime:time,
          reduced:false
        });
        assert.ok(Number.isFinite(p.tilt)&&Math.abs(p.tilt)<=18,`${id}/${slotName}: tilt escaped envelope`);
        assert.ok(Number.isFinite(p.gaze_x)&&Math.abs(p.gaze_x)<=16,`${id}/${slotName}: gaze_x escaped envelope`);
        assert.ok(Number.isFinite(p.gaze_y)&&Math.abs(p.gaze_y)<=12,`${id}/${slotName}: gaze_y escaped envelope`);
        for(const key of ['lx','ly','rx','ry','la','ra','lr','rr','sx','sy']){
          assert.ok(Number.isFinite(p[key]),`${id}/${slotName}: ${key} is not finite`);
        }
        assert.ok(Math.abs(p.lx)<=165&&Math.abs(p.rx)<=165,`${id}/${slotName}: hand x escaped envelope`);
        assert.ok(p.ly>=-95&&p.ly<=110&&p.ry>=-95&&p.ry<=110,`${id}/${slotName}: hand y escaped envelope`);
      }
    }
  }
});
