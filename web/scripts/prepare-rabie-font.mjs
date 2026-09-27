import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const webRoot=fileURLToPath(new URL('..',import.meta.url));
const sourceDir=join(webRoot,'font-src');
const target=join(webRoot,'src','assets','Rabie-DAI-Arabic.woff2');
const parts=[0,1,2,3,4].map(index=>{
  const name='rabie-ar-'+String(index).padStart(2,'0')+'.b64';
  return readFileSync(join(sourceDir,name),'utf8').replace(/\s+/g,'');
}).join('');

const bytes=Buffer.from(parts,'base64');
const expectedSize=36912;
const expectedSha='9cd8ee5486dd8187b36f1442fa2aae1e172196d98696bd8ca6caee1e0db19e59';
const actualSha=createHash('sha256').update(bytes).digest('hex');

if(bytes.length!==expectedSize||actualSha!==expectedSha||bytes.subarray(0,4).toString('ascii')!=='wOF2'){
  throw new Error('Rabie DAI Arabic font payload failed integrity validation');
}

mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,bytes);
console.log('Prepared official DAI Arabic font: Rabie ('+bytes.length+' bytes)');
