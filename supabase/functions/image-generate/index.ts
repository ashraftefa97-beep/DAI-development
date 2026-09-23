import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'https://ashraftefa97-beep.github.io',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...corsHeaders,'Content-Type':'application/json'}
  });
}

function unsafePrompt(text:string){
  return /(?:porn|xxx|nude|nudity|explicit\s*sex|sexualized|إباح|عاري|عارية|عري|مخدر|حشيش|ماريجوانا|كوكايين|هيروين|cocaine|heroin|cannabis|marijuana|مسدس|بندقي|ذخيرة|gun|firearm|ammo|knife|سكين|خنجر|taser|صاعق|suicide|self[-\s]*harm|انتحار|إيذاء النفس|تحدي خطير|dangerous challenge)/i.test(text);
}

function aspectSize(aspect:string){
  if(aspect==='9:16')return {width:768,height:1365};
  if(aspect==='16:9')return {width:1365,height:768};
  if(aspect==='4:5')return {width:896,height:1120};
  if(aspect==='1:1')return {width:1024,height:1024};
  return {width:1024,height:1024};
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);

  const authorization=req.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))return json({error:'Unauthorized'},401);

  const publishableKeys=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}');
  const publicKey=publishableKeys.default||Deno.env.get('SUPABASE_ANON_KEY');
  if(!publicKey)return json({error:'Service unavailable'},503);

  const supabase=createClient(
    Deno.env.get('SUPABASE_URL')!,
    publicKey,
    {global:{headers:{Authorization:authorization}}}
  );

  const {data:authData,error:authError}=await supabase.auth.getUser();
  if(authError||!authData.user)return json({error:'Unauthorized'},401);

  const {data:rateAllowed,error:rateError}=await supabase.rpc('dai_rate_limit_hit',{
    p_limit:6,
    p_window_seconds:60
  });
  if(rateError)return json({error:'خدمة الصور مشغولة حاليًا.'},503);
  if(rateAllowed!==true)return json({error:'طلبات صور كتير في وقت قصير. استنى شوية.'},429);

  const body=await req.json().catch(()=>({}));
  const prompt=String(body?.prompt||'').trim().slice(0,1200);
  const aspect=String(body?.aspect||'1:1');

  if(!prompt)return json({error:'وصف الصورة مطلوب.'},400);
  if(unsafePrompt(prompt)){
    return json({error:'مش هقدر أعمل الصورة بالوصف ده. جرّب وصف آمن ومناسب.'},400);
  }

  const {width,height}=aspectSize(aspect);
  const seed=Math.floor(Math.random()*1_000_000_000);
  const enhanced=
    'high quality, polished, coherent composition, clean lighting, no text unless explicitly requested, '+prompt;

  const imageUrl=
    'https://image.pollinations.ai/prompt/'+encodeURIComponent(enhanced)+
    '?width='+width+
    '&height='+height+
    '&seed='+seed+
    '&nologo=true&enhance=true&model=flux';

  return json({
    ok:true,
    imageUrl,
    seed,
    width,
    height,
    provider:'free-image'
  });
});
