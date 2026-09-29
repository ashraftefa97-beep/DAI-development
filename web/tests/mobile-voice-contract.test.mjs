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

test('live voice uses hybrid VAD with server speech detection and fast local finalization',()=>{
  assert.match(app,/liveNoiseFloorRef/);
  assert.match(app,/disabled:false/);
  assert.match(app,/startOfSpeechSensitivity:'START_SENSITIVITY_HIGH'/);
  assert.match(app,/endOfSpeechSensitivity:'END_SENSITIVITY_LOW'/);
  assert.match(app,/silenceDurationMs:1200/);
  assert.match(app,/activityHandling:'START_OF_ACTIVITY_INTERRUPTS'/);
  assert.match(app,/audioStreamEnd:true/);
  assert.match(app,/const chunkSamples=320/);
  assert.match(app,/livePreRollPacketsRef\.current\.push\(\.\.\.packets\)/);
  assert.match(app,/for\(const packet of preRoll\)sendAudioPacket\(packet\)/);
  assert.match(app,/Once speech is confirmed, stream only that active turn/);
  assert.doesNotMatch(app,/Hybrid VAD: continuously feed the provider/);
});


test('live voice carries context and preserves natural pauses locally',()=>{
  assert.match(app,/recentLiveHistory/);
  assert.match(app,/sendAudioStreamEnd/);
  assert.match(app,/endHoldMs=spokenMs<650\?1050:850/);
  assert.match(app,/incompleteSpeechTail/);
  assert.match(app,/لو المستخدم باين إنه بيفكر أو كلامه لسه مكمل/);
});


test('live voice preserves natural pauses and barge-in stops local playback immediately',()=>{
  assert.match(app,/heldMs>=70/);
  assert.match(app,/if\(outputSpeaking\)stopLivePlayback\(\)/);
  assert.match(app,/audioStreamEnd:true/);
});


test('live voice starts from structured chat history',()=>{
  assert.match(app,/const recentLiveHistory=/);
  assert.match(app,/role:message\.role==='assistant'\?'model':'user'/);
  assert.match(app,/historyConfig:\{initialHistoryInClientContent:!resumeHandle\}/);
  assert.match(app,/sessionResumption:resumeHandle\?\{handle:resumeHandle\}:\{\}/);
  assert.match(app,/sessionResumptionUpdate/);
  assert.match(app,/turns:recentLiveHistory/);
});
