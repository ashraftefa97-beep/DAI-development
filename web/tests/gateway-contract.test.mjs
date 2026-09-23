import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const stream=fs.readFileSync(new URL('../../supabase/functions/chat-stream/index.ts',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
const research=fs.readFileSync(new URL('../../supabase/functions/web-research/index.ts',import.meta.url),'utf8');

test('chat-stream owns research and retry resilience',()=>{
  assert.match(stream,/researchOnly/);
  assert.match(stream,/rollbackFailedTurn/);
  assert.match(stream,/dai_search_cache/);
  assert.match(stream,/dai_provider_state/);
  assert.match(stream,/fallback_used/);
  assert.match(stream,/search_engine/);
});

test('web research compatibility route delegates to chat-stream',()=>{
  assert.match(research,/\/functions\/v1\/chat-stream/);
  assert.doesNotMatch(research,/generativelanguage\.googleapis\.com/);
});

test('main UI does not invoke legacy chat endpoint',()=>{
  assert.match(app,/\/functions\/v1\/chat-stream/);
  assert.doesNotMatch(app,/supabase\.functions\.invoke\(['"]chat['"]/);
});

test('client captures first-event and TTS timing',()=>{
  assert.match(app,/client_first_event_ms/);
  assert.match(app,/tts_start_ms/);
  assert.match(app,/tts_end_ms/);
});
