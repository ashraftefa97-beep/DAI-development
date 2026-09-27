import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const webRoot=fileURLToPath(new URL('..',import.meta.url));
const sourceDir=join(webRoot,'font-parts');
const target=join(webRoot,'src','assets','Rabie-DAI.woff2');
const partNames=[
  'rabie-01.b64',
  'rabie-02.b64',
  'rabie-03.b64',
  'rabie-04.b64',
  'rabie-05.b64',
  'rabie-06.b64',
  'rabie-07.b64',
];
const parts=partNames.map(name=>
  readFileSync(join(sourceDir,name),'utf8').replace(/\s+/g,'')
).join('');

const bytes=Buffer.from(parts,'base64');
const expectedSize=69548;
const expectedSha='f6e2bd694c8662a467731d595af69bee74969ed5f4cdff5efe655366b1107f06';
const actualSha=createHash('sha256').update(bytes).digest('hex');

if(bytes.length!==expectedSize||actualSha!==expectedSha||bytes.subarray(0,4).toString('ascii')!=='wOF2'){
  throw new Error('Rabie DAI unified Arabic/Latin font payload failed integrity validation');
}

mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,bytes);
console.log('Prepared official DAI font: Rabie Arabic + Latin ('+bytes.length+' bytes)');
