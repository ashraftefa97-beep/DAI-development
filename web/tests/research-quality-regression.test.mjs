import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const stream=readFileSync(new URL('../../supabase/functions/chat-stream/index.ts',import.meta.url),'utf8');

test('research follow-ups inherit the previous user subject',()=>{
  assert.match(stream,/function isContextualResearchFollowup/);
  assert.match(stream,/function resolveResearchQuery/);
  assert.match(stream,/previous\+' — متابعة المستخدم: '\+current/);
  assert.match(stream,/directWebResearch\(apiKey, configuredModel, researchQuery/);
});

test('fresh research uses short cache windows',()=>{
  assert.match(stream,/function researchCacheTtl/);
  assert.match(stream,/return fresh \? 3\*60\*1000 : RESEARCH_CACHE_TTL_MS/);
  assert.match(stream,/function persistentResearchTtl/);
  assert.match(stream,/return fresh \? 5\*60\*1000 : 30\*60\*1000/);
});
