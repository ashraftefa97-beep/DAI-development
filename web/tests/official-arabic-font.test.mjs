import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const appCss=readFileSync(new URL('../src/index.css',import.meta.url),'utf8');
const marketingCss=readFileSync(new URL('../src/marketing.css',import.meta.url),'utf8');
const prepare=readFileSync(new URL('../scripts/prepare-rabie-font.mjs',import.meta.url),'utf8');
const generated=new URL('../src/assets/Rabie-DAI-Arabic.woff2',import.meta.url);

test('Rabie is the official Arabic typeface across DAI',()=>{
  assert.match(appCss,/@font-face[\s\S]*font-family:\s*["']Rabie DAI["']/);
  assert.match(appCss,/--font-identity:\s*["']Rabie DAI["']/);
  assert.match(marketingCss,/--dai-font-ar:\s*['"]Rabie DAI['"]/);
  assert.match(prepare,/9cd8ee5486dd8187b36f1442fa2aae1e172196d98696bd8ca6caee1e0db19e59/);
  assert.ok(existsSync(generated),'generated Rabie WOFF2 is missing');
  const bytes=readFileSync(generated);
  assert.equal(bytes.subarray(0,4).toString('ascii'),'wOF2');
});
