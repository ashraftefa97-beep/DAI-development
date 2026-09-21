import fs from 'node:fs';
import path from 'node:path';
import { product } from '../src/product.mjs';

const root=process.cwd();

function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

function read(file){
  try{return fs.readFileSync(file,'utf8');}catch{return '';}
}

const srcFiles=walk(path.join(root,'src')).filter(file=>/\.(ts|tsx|js|mjs)$/.test(file));
const distFiles=walk(path.join(root,'dist')).filter(file=>/\.(html|js|css|json|txt)$/.test(file));

const sourceForbidden=[
  ['dangerouslySetInnerHTML','unsafe React HTML injection'],
  ['eval(','eval usage'],
  ['new Function(','dynamic Function usage'],
];

const publicSecretPatterns=[
  ['SUPABASE_SERVICE_ROLE_KEY','service role key name leaked into public build'],
  ['GEMINI_API_KEY','AI provider secret name leaked into public build'],
  ['AI_API_KEY','AI provider secret name leaked into public build'],
  ['PAYPAL_CLIENT_SECRET','PayPal client secret name leaked into public build'],
  ['PAYPAL_WEBHOOK_ID','PayPal webhook identifier leaked into public build'],
  ['sk-proj-','OpenAI-style secret key leaked into public build'],
  ['service_role','service role material leaked into public build'],
];

const failures=[];

const canonicalProductPath=path.join(root,'..','shared','product.json');
try{
  const canonical=JSON.parse(read(canonicalProductPath)||'{}');
  const generatedComparable=JSON.parse(JSON.stringify(product));
  if(JSON.stringify(canonical)!==JSON.stringify(generatedComparable)){
    failures.push('shared/product.json and web/src/product.mjs are out of sync');
  }
}catch{
  failures.push('Could not validate canonical shared/product.json');
}

const animationCatalog=Array.isArray(product.animationCatalog)?product.animationCatalog:[];

const selectorCatalogPath=path.join(root,'..','supabase','functions','animation-select','catalog.ts');
const selectorCatalogSource=read(selectorCatalogPath);
const selectorMatch=selectorCatalogSource.match(/export const ANIMATION_CATALOG = (\[[\s\S]*\]) as const;/);
if(!selectorMatch){
  failures.push('Could not parse animation-select server allowlist');
}else{
  try{
    const selectorCatalog=JSON.parse(selectorMatch[1]);
    const webIds=animationCatalog.map(item=>String(item.id));
    const serverIds=selectorCatalog.map(item=>String(item.id));
    if(JSON.stringify(webIds)!==JSON.stringify(serverIds)){
      failures.push('Professional animation IDs differ between web catalog and server allowlist');
    }
  }catch{
    failures.push('animation-select server allowlist is invalid JSON-compatible data');
  }
}
if(animationCatalog.length!==84){
  failures.push(`DAI Professional animation catalog must contain exactly 84 animations, found ${animationCatalog.length}`);
}
const animationIds=animationCatalog.map(item=>String(item?.id||''));
if(new Set(animationIds).size!==animationIds.length){
  failures.push('DAI animation catalog contains duplicate ids');
}
const motionSource=read(path.join(root,'src','motion.mjs'));
const implementedGestures=new Set(
  [...motionSource.matchAll(/active==='([^']+)'/g)].map(match=>match[1])
);
for(const item of animationCatalog){
  const gesture=String(item?.gesture||'').replace('idle_soft','idle');
  if(!gesture){
    failures.push(`DAI animation ${item?.id||'<unknown>'} is missing a gesture`);
    continue;
  }
  if(gesture!=='idle'&&!implementedGestures.has(gesture)){
    failures.push(`DAI animation ${item.id} has no motion implementation for gesture "${gesture}"`);
  }
}

for(const file of srcFiles){
  const content=read(file);
  for(const [needle,label] of sourceForbidden){
    if(content.includes(needle))failures.push(`${label}: ${path.relative(root,file)}`);
  }
}

for(const file of distFiles){
  const content=read(file);
  for(const [needle,label] of publicSecretPatterns){
    if(content.includes(needle))failures.push(`${label}: ${path.relative(root,file)}`);
  }
}

const indexFile=path.join(root,'dist','index.html');
const index=read(indexFile);
if(!index.includes('Content-Security-Policy')){
  failures.push('dist/index.html is missing Content-Security-Policy');
}
if(!index.includes("object-src 'none'")){
  failures.push("CSP is missing object-src 'none'");
}
if(!index.includes("frame-src 'none'")){
  failures.push("CSP is missing frame-src 'none'");
}

if(failures.length){
  console.error('DAI security check failed:');
  for(const failure of failures)console.error('- '+failure);
  process.exit(1);
}

console.log(`DAI security check passed: ${srcFiles.length} source files, ${distFiles.length} public build files, and ${animationCatalog.length} animations checked.`);
