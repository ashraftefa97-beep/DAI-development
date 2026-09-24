// DAI watchdog probe v1
const PAGE_URL=(process.env.DAI_PAGE_URL||'https://ashraftefa97-beep.github.io/DAI-development/').replace(/\/+$/,'/') ;
const SUPABASE_URL=(process.env.DAI_SUPABASE_URL||'https://buenonmbyudjhpedmoqk.supabase.co').replace(/\/$/,'');
const TIMEOUT_MS=Number(process.env.DAI_WATCHDOG_TIMEOUT_MS||12000);
const RETRIES=Math.max(1,Number(process.env.DAI_WATCHDOG_RETRIES||3));

const checks=[];
const startedAt=Date.now();

function record(name,ok,detail='',latencyMs=0,severity=ok?'ok':'error'){
  checks.push({name,ok,detail:String(detail||''),latencyMs,severity});
  const icon=ok?'PASS':'FAIL';
  console.log(`[${icon}] ${name}${latencyMs?` (${latencyMs}ms)`:''}${detail?` - ${detail}`:''}`);
}

async function fetchRetry(url,init={},expected){
  let lastError=null;
  for(let attempt=1;attempt<=RETRIES;attempt++){
    const started=Date.now();
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),TIMEOUT_MS);
      let response;
      try{
        response=await fetch(url,{...init,cache:'no-store',signal:controller.signal,headers:{'cache-control':'no-cache',...(init.headers||{})}});
      }finally{
        clearTimeout(timeout);
      }
      const latencyMs=Date.now()-started;
      if(!expected||expected(response))return {response,latencyMs,attempt};
      lastError=new Error(`unexpected HTTP ${response.status}`);
    }catch(error){
      lastError=error;
    }
    if(attempt<RETRIES)await new Promise(resolve=>setTimeout(resolve,1000*attempt));
  }
  throw lastError||new Error('request failed');
}

async function checkPage(){
  const {response,latencyMs}=await fetchRetry(PAGE_URL,{},r=>r.ok);
  const html=await response.text();
  const looksLikeDai=/DAI AI|id=["']root["']/i.test(html);
  if(!looksLikeDai)throw new Error('homepage HTML did not contain DAI markers');
  record('homepage',true,'public app reachable',latencyMs);

  const assetMatches=[...html.matchAll(/(?:src|href)=["']([^"']*assets\/[^"']+\.(?:js|css))["']/gi)].map(m=>m[1]);
  const assets=[...new Set(assetMatches)].slice(0,6);
  if(!assets.length)throw new Error('no built JS/CSS assets found in homepage');

  for(const asset of assets){
    const url=new URL(asset,PAGE_URL).href;
    const result=await fetchRetry(url,{},r=>r.ok);
    const length=Number(result.response.headers.get('content-length')||0);
    record('asset:'+asset.split('/').pop(),true,length?`${length} bytes`:'asset reachable',result.latencyMs);
  }
}

async function checkServiceWorker(){
  const url=new URL('sw.js',PAGE_URL).href;
  const {response,latencyMs}=await fetchRetry(url,{},r=>r.ok);
  const body=await response.text();
  if(!body.includes('networkFirst'))throw new Error('service worker content is incomplete');
  record('service-worker',true,'network-first shell active',latencyMs);
}

async function checkProtectedEdge(name,body){
  const url=`${SUPABASE_URL}/functions/v1/${name}`;
  const {response,latencyMs}=await fetchRetry(url,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(body||{})
  },r=>r.status===401||r.status===403);
  record('edge:'+name,true,`auth gateway healthy (HTTP ${response.status})`,latencyMs);
  if(latencyMs>5000)record('latency:'+name,true,`slow response: ${latencyMs}ms`,latencyMs,'warning');
}

async function checkCors(name){
  const url=`${SUPABASE_URL}/functions/v1/${name}`;
  const {response,latencyMs}=await fetchRetry(url,{method:'OPTIONS'},r=>r.ok);
  record('cors:'+name,true,`HTTP ${response.status}`,latencyMs);
}

async function run(){
  const tasks=[
    ['homepage',checkPage],
    ['service-worker',checkServiceWorker],
    ['chat',()=>checkProtectedEdge('chat-stream',{message:'watchdog-health-check'})],
    ['research',()=>checkProtectedEdge('web-research',{query:'watchdog-health-check'})],
    ['tts',()=>checkProtectedEdge('tts-gemini',{text:'watchdog'})],
    ['live-voice-token',()=>checkProtectedEdge('live-token',{})],
    ['voice-transcription',()=>checkProtectedEdge('transcribe-voice',{audioBase64:'',mimeType:'audio/webm'})],
    ['tts-cors',()=>checkCors('tts-gemini')],
    ['live-cors',()=>checkCors('live-token')],
    ['transcribe-cors',()=>checkCors('transcribe-voice')]
  ];

  for(const [name,fn] of tasks){
    try{await fn();}
    catch(error){
      record(name,false,error instanceof Error?error.message:String(error));
    }
  }

  const failures=checks.filter(item=>!item.ok);
  const warnings=checks.filter(item=>item.severity==='warning');
  const summary={
    healthy:failures.length===0,
    checkedAt:new Date().toISOString(),
    durationMs:Date.now()-startedAt,
    failures,
    warnings,
    checks
  };

  console.log('DAI_WATCHDOG_SUMMARY='+JSON.stringify(summary));
  if(process.env.GITHUB_STEP_SUMMARY){
    const fs=await import('node:fs');
    const lines=[
      '# DAI Watchdog',
      '',
      summary.healthy?'**Status: healthy**':'**Status: unhealthy**',
      '',
      `Checked: ${summary.checkedAt}`,
      `Duration: ${summary.durationMs} ms`,
      '',
      '| Check | Status | Latency | Detail |',
      '|---|---:|---:|---|',
      ...checks.map(item=>`| ${item.name} | ${item.ok?'PASS':'FAIL'} | ${item.latencyMs||'-'} | ${String(item.detail).replace(/\|/g,'\\|')} |`)
    ];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
  }

  if(!summary.healthy)process.exitCode=1;
}

await run();
