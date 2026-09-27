const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const buckets = new Map<string,{count:number;reset:number}>();

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...corsHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
  });
}

function limited(ip:string){
  const now=Date.now();
  const current=buckets.get(ip);
  if(!current||current.reset<now){
    buckets.set(ip,{count:1,reset:now+10*60*1000});
    return false;
  }
  current.count+=1;
  buckets.set(ip,current);
  return current.count>12;
}

function models(configured:string){
  const preferred=['gemini-3.5-flash-lite','gemini-3.8-flash'];
  if(/^gemini-3\./i.test(configured)) preferred.unshift(configured);
  return preferred.filter((value,index,all)=>all.indexOf(value)===index);
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);

  const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'anon').split(',')[0].trim();
  if(limited(ip)) return json({error:'rate_limited'},429);

  const body=await req.json().catch(()=>({}));
  const message=String(body?.message||'').trim().slice(0,260);
  const locale=String(body?.locale||'ar').slice(0,8);
  if(!message) return json({error:'empty_message'},400);

  const apiKey=(Deno.env.get('GEMINI_API_KEY')||Deno.env.get('AI_API_KEY')||'').trim();
  if(!apiKey){
    console.error('marketing-demo: missing AI key');
    return json({error:'unavailable'},503);
  }

  const configured=(Deno.env.get('AI_MODEL')||'').trim();
  const language=locale==='ar'?'Egyptian Arabic':locale==='en'?'English':"the user's language";
  const systemText=
    'You are DAI / ضي, a concise AI assistant in a public product demo. '+
    'Reply in '+language+'. Keep the answer useful, warm, direct, and under 90 words. '+
    'Do not claim you searched the web, opened apps, changed files, or performed actions. '+
    'Do not mention model providers. This is only a lightweight public demo.';

  let lastStatus=0;
  let lastDetail='';

  for(const model of models(configured)){
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),12000);
      const response=await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',
        {
          method:'POST',
          signal:controller.signal,
          headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},
          body:JSON.stringify({
            systemInstruction:{parts:[{text:systemText}]},
            contents:[{role:'user',parts:[{text:message}]}],
            generationConfig:{maxOutputTokens:220,temperature:.45,topP:.9,thinkingConfig:{thinkingLevel:'minimal'}}
          })
        }
      ).finally(()=>clearTimeout(timer));

      lastStatus=response.status;
      const raw=await response.text().catch(()=>'');
      lastDetail=raw.slice(0,500);
      if(!response.ok){
        console.warn('marketing-demo provider status',model,response.status,lastDetail);
        if([404,429,503].includes(response.status)) continue;
        break;
      }

      const data=JSON.parse(raw||'{}');
      const reply=String(data?.candidates?.[0]?.content?.parts?.map((part:any)=>part?.text||'')?.join('')||'').trim();
      if(reply){
        console.log('marketing-demo success',model);
        return json({ok:true,reply:reply.slice(0,900),model:'dai-fast'});
      }
    }catch(error){
      lastDetail=String(error||'').slice(0,500);
      console.warn('marketing-demo provider error',model,lastDetail);
    }
  }

  console.error('marketing-demo failed',lastStatus,lastDetail);
  return json({error:'failed'},503);
});