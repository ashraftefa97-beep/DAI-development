const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);

  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return json({error:'Unauthorized'},401);

  const body=await req.json().catch(()=>({}));
  const query=String(body?.query||body?.message||'').trim().slice(0,8000);
  if(!query)return json({error:'Search query is required'},400);

  const {url,apikey}=gatewayConfig();
  if(!url||!apikey)return json({error:'Search gateway unavailable'},503);

  try{
    const response=await fetch(url+'/functions/v1/chat-stream',{
      method:'POST',
      headers:{
        Authorization:authorization,
        apikey,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        query,
        message:query,
        researchOnly:true,
        routeHint:'research',
        requestId:'legacy-research-'+crypto.randomUUID()
      })
    });

    const text=await response.text();
    return new Response(text,{
      status:response.status,
      headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}
    });
  }catch(error){
    console.error('DAI research gateway proxy failed',error);
    return json({error:'ضي مش قادرة تكمل البحث دلوقتي.',code:'RESEARCH_GATEWAY'},502);
  }
});
