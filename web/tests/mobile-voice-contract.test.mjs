import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/index.css',import.meta.url),'utf8');

test('mobile viewport follows VisualViewport and keyboard state',()=>{
  assert.match(app,/window\.visualViewport/);
  assert.match(app,/--dai-viewport-height/);
  assert.match(app,/dataSet|dataset\.daiKeyboard|dataset\['daiKeyboard'\]/i);
  assert.match(css,/--dai-viewport-height/);
  assert.match(css,/data-dai-keyboard="open"/);
});

test('mobile shell honors safe areas',()=>{
  assert.match(css,/safe-area-inset-top/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/safe-area-inset-left/);
  assert.match(css,/safe-area-inset-right/);
});

test('live voice has adaptive barge-in and provider VAD',()=>{
  assert.match(app,/liveNoiseFloorRef/);
  assert.match(app,/automaticActivityDetection/);
  assert.match(app,/silenceDurationMs:900/);
  assert.match(app,/transitionCorePhase\('speaking'/);
  assert.match(app,/functions\/v1\/tts-stream/);
  assert.match(app,/const chunkSamples=320/);
});


test('live voice carries recent conversation context and natural turn timing',()=>{
  assert.match(app,/recentLiveContext/);
  assert.match(app,/silenceDurationMs:900/);
  assert.match(app,/prefixPaddingMs:90/);
  assert.match(app,/لو المستخدم عمل وقفة قصيرة وهو بيتكلم/);
  assert.match(app,/لو قاطعك أو بدأ يتكلم فوق صوتك/);
});


test('live voice waits through natural pauses and handles interruption handoff',()=>{
  assert.match(app,/endOfSpeechSensitivity:'END_SENSITIVITY_LOW'/);
  assert.match(app,/silenceDurationMs:900/);
  assert.match(app,/Number\.POSITIVE_INFINITY/);
  assert.match(app,/Number\.isFinite\(liveNextPlayTimeRef\.current\)/);
});
