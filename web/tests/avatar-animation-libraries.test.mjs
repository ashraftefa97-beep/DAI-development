import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { gestures } from '../src/motion.mjs';
import { AVATAR_ANIMATION_LIBRARIES, validateAvatarLibrary } from '../src/avatarAnimations/index.mjs';
import { REQUIRED_AVATAR_ANIMATION_SLOTS, AVATAR_LIBRARY_SIZE, AVATAR_VARIANT_COUNTS } from '../src/avatarAnimations/runtime.mjs';

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

test('avatar animation libraries satisfy the 80-motion publish contract',()=>{
  const validGestures=new Set(gestures);
  assert.equal(AVATAR_LIBRARY_SIZE,80);
  assert.equal(Object.values(AVATAR_VARIANT_COUNTS).reduce((sum,value)=>sum+value,0),80);

  const globalFingerprints=new Set();
  let globalVariantCount=0;

  for(const id of catalogIds){
    const library=AVATAR_ANIMATION_LIBRARIES[id];
    assert.ok(library,`missing animation library for ${id}`);
    assert.equal(library.id,id,`library id mismatch for ${id}`);
    assert.equal(library.variantCount,80,`${id}: must expose 80 choreographies`);
    assert.deepEqual(validateAvatarLibrary(library),[],`invalid library: ${id}`);
    assert.ok(library.reducedMotion?.intensity>0&&library.reducedMotion.intensity<=.45,`${id}: invalid reduced intensity`);
    assert.ok(library.reducedMotion?.minDurationMs>=2400,`${id}: reduced motion duration too short`);

    const allVariantIds=[];
    const localFingerprints=new Set();

    for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
      const variants=library.slots[slot];
      assert.equal(variants.length,AVATAR_VARIANT_COUNTS[slot],`${id}: wrong ${slot} choreography count`);

      for(const variant of variants){
        globalVariantCount++;
        allVariantIds.push(variant.id);
        assert.ok(validGestures.has(variant.gesture),`${id}: ${variant.id} uses unknown gesture ${variant.gesture}`);
        assert.ok(variant.motion&&Number.isFinite(variant.motion.speed),`${id}: ${variant.id} missing motion profile`);
        assert.ok(Number.isFinite(variant.motion.gazeX)&&Number.isFinite(variant.motion.handBias),`${id}: ${variant.id} missing layered motion DNA`);
        assert.ok(Array.isArray(variant.durationMs)&&variant.durationMs[1]>=variant.durationMs[0],`${id}: ${variant.id} invalid duration`);
        assert.ok(variant.fingerprint,`${id}: ${variant.id} missing fingerprint`);
        assert.ok(!localFingerprints.has(variant.fingerprint),`${id}: duplicate local motion fingerprint`);
        assert.ok(!globalFingerprints.has(variant.fingerprint),`${id}: choreography duplicates another avatar`);
        localFingerprints.add(variant.fingerprint);
        globalFingerprints.add(variant.fingerprint);
      }
    }

    assert.equal(allVariantIds.length,80,`${id}: expected exactly 80 choreographies`);
    assert.equal(new Set(allVariantIds).size,80,`${id}: duplicate variant ids`);
    assert.equal(localFingerprints.size,80,`${id}: fingerprints are not unique`);
  }

  assert.equal(globalVariantCount,24*80);
  assert.equal(globalFingerprints.size,24*80);
});

test('libraries expose distinct personality signatures and meaningful motion variety',()=>{
  const personalities=new Set();
  const signatures=new Set();

  for(const id of catalogIds){
    const library=AVATAR_ANIMATION_LIBRARIES[id];
    assert.ok(!personalities.has(library.personality),`${id}: personality signature is reused`);
    personalities.add(library.personality);

    const signature=REQUIRED_AVATAR_ANIMATION_SLOTS
      .map(slot=>library.slots[slot].map(item=>item.fingerprint).join(','))
      .join('|');

    assert.ok(signature.length>400,`${id}: motion signature too small`);
    for(const slot of REQUIRED_AVATAR_ANIMATION_SLOTS){
      const variants=library.slots[slot];
      assert.equal(
        new Set(variants.map(item=>item.fingerprint)).size,
        variants.length,
        `${id}: ${slot} motion DNA is not varied`
      );
    }
    assert.ok(!signatures.has(signature),`${id}: full motion signature duplicates another avatar`);
    signatures.add(signature);
  }

  assert.equal(personalities.size,24);
  assert.equal(signatures.size,24);
});
