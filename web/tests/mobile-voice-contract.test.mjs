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

test('live voice uses deterministic client VAD and explicit activity signals',()=>{
  assert.match(app,/liveNoiseFloorRef/);
  assert.match(app,/automaticActivityDetection:\{disabled:true\}/);
  assert.match(app,/activityHandling:'START_OF_ACTIVITY_INTERRUPTS'/);
  assert.match(app,/turnCoverage:'TURN_INCLUDES_ONLY_ACTIVITY'/);
  assert.match(app,/activityStart/);
  assert.match(app,/activityEnd/);
  assert.match(app,/const chunkSamples=320/);
});


test('live voice carries context and preserves natural pauses locally',()=>{
  assert.match(app,/recentLiveContext/);
  assert.match(app,/livePreRollPacketsRef/);
  assert.match(app,/endHoldMs=spokenMs<650\?1450:1120/);
  assert.match(app,/incompleteSpeechTail/);
  assert.match(app,/لو المستخدم باين إنه بيفكر أو كلامه لسه مكمل/);
});


test('live voice waits through pauses and barge-in stops local playback immediately',()=>{
  assert.match(app,/heldMs>=55/);
  assert.match(app,/if\(outputSpeaking\)stopLivePlayback\(\)/);
  assert.match(app,/sendActivity\('start'\)/);
  assert.match(app,/sendActivity\('end'\)/);
});
