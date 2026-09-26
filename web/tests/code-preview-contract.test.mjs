import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
const coder=readFileSync(new URL('../src/localCoder.ts',import.meta.url),'utf8');
const edge=readFileSync(new URL('../../supabase/functions/chat-stream/index.ts',import.meta.url),'utf8');

test('DAI renders fenced HTML as a live sandboxed preview',()=>{
  assert.match(app,/function htmlPreviewFromMessage/);
  assert.match(app,/className='dai-site-preview'/);
  assert.match(app,/srcDoc=\{preview\}/);
  assert.match(app,/sandbox='allow-scripts allow-forms allow-modals allow-popups'/);
  assert.match(app,/فتح المعاينة/);
});

test('DAI coding routes have enough room for complete website builds',()=>{
  assert.match(coder,/max_tokens:4500/);
  assert.match(edge,/route === 'code'\) return 5200/);
  assert.match(edge,/route === 'code'\) return 55000/);
});

test('DAI coding prompt asks for complete production-ready responsive output',()=>{
  assert.match(coder,/production-ready/);
  assert.match(coder,/responsive/);
  assert.match(edge,/production-ready/);
  assert.match(edge,/fenced code block/);
});
