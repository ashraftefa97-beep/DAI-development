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
  assert.match(app,/silenceDurationMs:260/);
  assert.match(app,/transitionCorePhase\('speaking'/);
  assert.match(app,/functions\/v1\/tts-stream/);
  assert.match(app,/const chunkSamples=320/);
});
