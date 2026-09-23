const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ashraftefa97-beep.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}
  });
}

function gatewayConfig(){
  const url=(Deno.env.get('SUPABASE_URL')||'').replace(/\/$/,'');
  const keys=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}');
  const apikey=keys.default||Deno.env.get('SUPABASE_ANON_KEY')||'';
  return {url,apikey};
}

function parseSse(text:string){
  let done:any=null;
  let failure:any=null;

  for(const frame of String(text||'').split(/\r?\n\r?\n/)){
    if(!frame.trim())continue;
    let eventName='message';
    const dataLines:string[]=[];
    for(const line of frame.split(/\r?\n/)){
      if(line.startsWith('event:'))eventName=line.slice(6).trim();
      else if(line.startsWith('data:'))dataLines.push(line.slice(5).trim());
    }
    if(!dataLines.length)continue;
    let payload:any=null;
    try{payload=JSON.parse(dataLines.join('\n'));}catch{continue;}
    if(eventName==='done')done=payload;
    else if(eventName==='error')failure=payload;
  }

  return {done,failure};
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);

  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return json({error:'Unauthorized'},401);

  const body=await req.json().catch(()=>({}));
  const message=String(body?.message||'').trim();
  if(!message)return json({error:'Message is required'},400);

  const {url,apikey}=gatewayConfig();
  if(!url||!apikey)return json({error:'Chat gateway unavailable'},503);

  try{
    const response=await fetch(url+'/functions/v1/chat-stream',{
      method:'POST',
      headers:{
        Authorization:authorization,
        apikey,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        conversationId:body?.conversationId||null,
        message,
        desktopActionResult:body?.desktopActionResult||null,
        routeHint:body?.routeHint||null,
        requestId:'legacy-chat-'+crypto.randomUUID()
      })
    });

    if(!response.ok){
      const detail=await response.text().catch(()=>'');
      return json({error:'ضي واجهت مشكلة وهي بتجهز الرد.',detail:detail.slice(0,300)},response.status);
    }

    const streamText=await response.text();
    const {done,failure}=parseSse(streamText);
    if(failure&&!done){
      return json({
        error:String(failure?.message||'ضي واجهت مشكلة وهي بتجهز الرد.'),
        code:String(failure?.code||'CHAT_GATEWAY')
      },502);
    }
    if(!done?.assistantMessage){
      return json({error:'ضي مردتش بشكل كامل.',code:'CHAT_EMPTY'},502);
    }

    return json({
      conversationId:done.conversationId,
      userMessage:done.userMessage,
      assistantMessage:done.assistantMessage,
      sources:Array.isArray(done.sources)?done.sources:[],
      performance:done.performance||null,
      engine:'chat-stream-compat'
    });
  }catch(error){
    console.error('DAI legacy chat proxy failed',error);
    return json({error:'ضي مش قادرة تجهز الرد دلوقتي.',code:'CHAT_GATEWAY'},502);
  }
});
