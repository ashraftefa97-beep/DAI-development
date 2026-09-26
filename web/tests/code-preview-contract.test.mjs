import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../src/GithubApp.tsx',import.meta.url),'utf8');
const coder=readFileSync(new URL('../src/localCoder.ts',import.meta.url),'utf8');
const edge=readFileSync(new URL('../../supabase/functions/chat-stream/index.ts',import.meta.url),'utf8');
const preview=readFileSync(new URL('../public/preview.html',import.meta.url),'utf8');

test('DAI renders generated HTML inline and in a same-origin preview page',()=>{
  assert.match(app,/function htmlPreviewFromMessage/);
  assert.match(app,/className='dai-site-preview'/);
  assert.match(app,/srcDoc=\{preview\}/);
  assert.match(app,/sandbox='allow-scripts allow-forms allow-modals allow-popups'/);
  assert.match(app,/localStorage\.setItem\(key,html\)/);
  assert.match(app,/new URL\('\.\/preview\.html',window\.location\.href\)/);
  assert.match(preview,/localStorage\.getItem\(key\)/);
  assert.match(preview,/frame\.srcdoc=html/);
});

test('online coding uses the stronger server DAI Code Studio instead of the small local model',()=>{
  assert.match(app,/Prefer the stronger server-side deep coding path while online/);
  assert.ok(!/const handled=await runLocalCodeReply\(text\)/.test(app));
  assert.match(edge,/code-studio-reviewed/);
  assert.match(edge,/generateCodeStudioPass/);
});

test('DAI Code Studio gives full websites a senior design review pass',()=>{
  assert.match(edge,/Senior Frontend Engineer/);
  assert.match(edge,/Product Designer/);
  assert.match(edge,/websiteRequest\?7800:6500/);
  assert.match(edge,/8200/);
  assert.match(edge,/websiteCodeLooksComplete/);
  assert.match(edge,/responsive mobile/);
});

test('the local coder remains a capable offline fallback asset',()=>{
  assert.match(coder,/max_tokens:6000/);
  assert.match(coder,/production-ready/);
  assert.match(coder,/responsive/);
});
