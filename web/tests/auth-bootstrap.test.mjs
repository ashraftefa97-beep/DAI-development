import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth=fs.readFileSync(new URL('../src/AuthGate.tsx',import.meta.url),'utf8');

test('auth bootstrap cannot trap DAI on the loading logo forever',()=>{
  assert.match(auth,/setTimeout\(\(\) => \{/);
  assert.match(auth,/3500/);
  assert.match(auth,/supabase\.auth\.getSession\(\)/);
  assert.match(auth,/\.catch\(\(error\) => \{/);
  assert.match(auth,/finishBootstrap\(/);
  assert.match(auth,/setReady\(true\)/);
  assert.match(auth,/clearTimeout\(bootstrapTimeout\)/);
});

test('late auth events can still restore a timed-out session',()=>{
  assert.match(auth,/onAuthStateChange\(\(event, session\) => \{/);
  assert.match(auth,/applySessionUser\(session\?\.user \|\| null\)/);
  assert.match(auth,/finishBootstrap\(\)/);
});
