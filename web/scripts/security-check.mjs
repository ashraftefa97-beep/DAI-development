import fs from 'node:fs';
import path from 'node:path';

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

console.log(`DAI security check passed: ${srcFiles.length} source files and ${distFiles.length} public build files checked.`);
