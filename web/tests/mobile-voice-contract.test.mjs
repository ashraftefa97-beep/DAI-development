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

test('live voice uses provider VAD and continuously streams microphone PCM',()=>{
  assert.match(app,/liveNoiseFloorRef/);
  assert.match(app,/disabled:false/);
  assert.match(app,/startOfSpeechSensitivity:'START_SENSITIVITY_HIGH'/);
  assert.match(app,/endOfSpeechSensitivity:'END_SENSITIVITY_LOW'/);
  assert.match(app,/silenceDurationMs:1200/);
  assert.match(app,/activityHandling:'START_OF_ACTIVITY_INTERRUPTS'/);
  assert.match(app,/const chunkSamples=320/);
  assert.match(app,/Server-VAD owns speech start\/end/);
  assert.match(app,/for\(const packet of packets\)sendAudioPacket\(packet\)/);
  assert.doesNotMatch(app,/Gate realtime audio with local VAD/);
});


test('live voice carries context while provider VAD preserves natural pauses',()=>{
  assert.match(app,/recentLiveHistory/);
  assert.match(app,/silenceDurationMs:1200/);
  assert.match(app,/TURN_INCLUDES_ONLY_ACTIVITY/);
  assert.match(app,/لو المستخدم باين إنه بيفكر أو كلامه لسه مكمل/);
});


test('live voice keeps local detection only for fast barge-in playback mute',()=>{
  assert.match(app,/Local level detection is only a fast playback mute for barge-in/);
  assert.match(app,/stopLivePlayback\(\)/);
  assert.match(app,/bargeThreshold/);
});


test('live voice starts from structured chat history',()=>{
  assert.match(app,/const recentLiveHistory=/);
  assert.match(app,/role:message\.role==='assistant'\?'model':'user'/);
  assert.match(app,/historyConfig:\{initialHistoryInClientContent:!resumeHandle\}/);
  assert.match(app,/sessionResumption:resumeHandle\?\{handle:resumeHandle\}:\{\}/);
  assert.match(app,/sessionResumptionUpdate/);
  assert.match(app,/turns:recentLiveHistory/);
});
