import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { gestures } from '../src/motion.mjs';
import { AVATAR_ANIMATION_LIBRARIES, validateAvatarLibrary } from '../src/avatarAnimations/index.mjs';
import { REQUIRED_AVATAR_ANIMATION_SLOTS } from '../src/avatarAnimations/runtime.mjs';

const catalogText=fs.readFileSync(new URL('../src/avatarCatalog.ts',import.meta.url),'utf8');
const catalogIds=[...catalogText.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);
const libraryDir=fileURLToPath(new URL('../src/avatarAnimations/libraries/',import.meta.url));
const libraryFiles=fs.readdirSync(libraryDir).filter(name=>name.endsWith('.mjs')).sort();
const libraryIds=libraryFiles.map(name=>name.replace(/\.mjs$/,'')).sort();

test('every DAI avatar has exactly one independent animation library',()=>{
  assert.equal(catalogIds.length,24);
  assert.equal(new Set(catalogIds).size,catalogIds.length);
  assert.deepEqual(libraryIds,[...catalogIds].sort());
  assert.deepEqual(Object.keys(AVATAR_ANIMATION_LIBRARIES).sort(),[...catalogIds].sort());
});

test('avatar animation libraries satisfy the publish contract',()=>{
  const validGestures=new Set(gestures);
  for(const id of catalogIds){
    const library=AVATAR_ANIMATION_LIBRARIES[id];
    assert.ok(library,`missing animation library for ${id}`);
    assert.equal(library.id,id,`library id mismatch for ${id}`);
    assert.deepEqual(validateAvatarLibrary(library),[],`invalid library: ${id}`);
    assert.ok(library.reducedMotion?.intensity>0&&library.reducedMotion.intensity<=.45,`${id}: invalid reduced intensity`);
    assert.ok(library.reducedMotion?.minDurationMs>=2400,`${id}: reduced motion duration too short`);

    const allVariantIds=[];
    for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
      const variants=library.slots[slot];
      assert.ok(Array.isArray(variants)&&variants.length>=2,`${id}: ${slot} needs multiple variants`);
      for(const variant of variants){
        allVariantIds.push(variant.id);
        assert.ok(validGestures.has(variant.gesture),`${id}: ${variant.id} uses unknown gesture ${variant.gesture}`);
        assert.ok(variant.motion&&Number.isFinite(variant.motion.speed),`${id}: ${variant.id} missing motion profile`);
        assert.ok(Array.isArray(variant.durationMs)&&variant.durationMs[1]>=variant.durationMs[0],`${id}: ${variant.id} invalid duration`);
      }
    }
    assert.equal(new Set(allVariantIds).size,allVariantIds.length,`${id}: duplicate variant ids`);
  }
});

test('libraries expose real variety instead of one repeated gesture',()=>{
  for(const id of catalogIds){
    const library=AVATAR_ANIMATION_LIBRARIES[id];
    const signature=REQUIRED_AVATAR_ANIMATION_SLOTS
      .map(slot=>library.slots[slot].map(item=>item.gesture).join(','))
      .join('|');
    assert.ok(signature.length>40,`${id}: animation signature too small`);
    assert.ok(new Set(library.slots.idle.map(item=>item.gesture)).size>=2,`${id}: idle library is not varied`);
    assert.ok(new Set(library.slots.thinking.map(item=>item.gesture)).size>=2,`${id}: thinking library is not varied`);
    assert.ok(new Set(library.slots.success.map(item=>item.gesture)).size>=2,`${id}: success library is not varied`);
  }
});
