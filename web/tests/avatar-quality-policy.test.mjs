import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAI_AVATAR_QUALITY_POLICY,
  validateAvatarQualityPolicy
} from '../src/avatarQualityPolicy.mjs';

test('canonical DAI avatar quality policy passes its quality gate',()=>{
  assert.deepEqual(validateAvatarQualityPolicy(),[]);
});

test('DAI avatar policy keeps face and audio sync ahead of decorative motion',()=>{
  const p=DAI_AVATAR_QUALITY_POLICY;
  assert.equal(p.identity.preserveDaiIdentity,true);
  assert.equal(p.identity.faceFirst,true);
  assert.deepEqual(p.identity.expressionPriority.slice(0,3),['eyes','brows','mouth']);
  assert.equal(p.motion.typingMouthMotion,false);
  assert.equal(p.voiceSync.neverAnimateSpeechBeforeAudio,true);
  assert.ok(p.voiceSync.mouthOnsetMaxMs<=80);
  assert.ok(p.voiceSync.mouthReleaseMaxMs<=120);
});

test('DAI avatar policy requires premium frame pacing without sacrificing the face',()=>{
  const p=DAI_AVATAR_QUALITY_POLICY;
  assert.equal(p.rendering.targetFps,60);
  assert.ok(p.rendering.fallbackFps>=30);
  assert.equal(p.rendering.preferStableFramePacing,true);
  assert.equal(p.rendering.preserveFaceBeforeParticles,true);
  assert.equal(p.motion.roboticLoopsForbidden,true);
});
