const MODEL_CANDIDATES = [
  'Qwen3-4B-q4f16_1-MLC',
  'Qwen3-1.7B-q4f16_1-MLC',
] as const;

type ProgressCallback = (progress:number,label:string)=>void;
type DeltaCallback = (delta:string,full:string)=>void;

let engine:any=null;
let engineModel='';
let enginePromise:Promise<any>|null=null;
let progressListener:ProgressCallback|null=null;

export function localGeneralSupported(){
  return typeof navigator!=='undefined' && 'gpu' in navigator;
}

export function localGeneralModel(){
  return engineModel;
}

async function createEngine(onProgress?:ProgressCallback){
  if(engine)return engine;
  if(!localGeneralSupported())throw new Error('WEBGPU_UNAVAILABLE');
  if(enginePromise){
    progressListener=onProgress||progressListener;
    return enginePromise;
  }

  progressListener=onProgress||null;

  enginePromise=(async()=>{
    const webllm=await import('@mlc-ai/web-llm');
    let lastError:any=null;

    for(const model of MODEL_CANDIDATES){
      try{
        progressListener?.(0,'ضي بتحضر محرك التفكير المحلي…');
        const next=await webllm.CreateMLCEngine(model,{
          initProgressCallback:(report:any)=>{
            const raw=Number(report?.progress||0);
            const progress=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0;
            progressListener?.(progress,String(report?.text||'ضي بتحضر محرك التفكير المحلي…'));
          }
        });
        engine=next;
        engineModel=model;
        progressListener?.(1,'محرك التفكير المحلي جاهز');
        return next;
      }catch(error){
        lastError=error;
      }
    }

    enginePromise=null;
    throw lastError||new Error('LOCAL_GENERAL_INIT_FAILED');
  })();

  return enginePromise;
}

function historyToMessages(history:Array<{role:'user'|'assistant';content:string}>){
  return history.slice(-8).map(item=>({
    role:item.role==='assistant'?'assistant':'user',
    content:String(item.content||'').slice(0,5000)
  }));
}

export async function runLocalGeneral(options:{
  prompt:string;
  history?:Array<{role:'user'|'assistant';content:string}>;
  onProgress?:ProgressCallback;
  onDelta?:DeltaCallback;
}){
  const localEngine=await createEngine(options.onProgress);
  progressListener=options.onProgress||null;

  const messages:any[]=[
    {
      role:'system',
      content:
        'أنت محرك التفكير المحلي داخل ضي. حلل الخطط والمشاكل والقرارات والشرح المتعمق. '+
        'جاوب بالمصري الطبيعي لما المستخدم عربي، وخلّي الإجابة منظمة وعملية. '+
        'لو السؤال محتاج معلومات حديثة أو بحث ويب، قول بوضوح إن المسار ده محلي ومحتاج تحويل لمسار البحث بدل اختلاق معلومات حديثة.'
    },
    ...historyToMessages(options.history||[]),
    {role:'user',content:options.prompt}
  ];

  const completion=await localEngine.chat.completions.create({
    messages,
    temperature:.25,
    top_p:.9,
    max_tokens:1800,
    stream:true,
    extra_body:{enable_thinking:false}
  } as any);

  let full='';
  for await(const chunk of completion as any){
    const delta=String(chunk?.choices?.[0]?.delta?.content||'');
    if(!delta)continue;
    full+=delta;
    options.onDelta?.(delta,full);
  }

  return {text:full.trim(),model:engineModel};
}

export function stopLocalGeneral(){
  try{engine?.interruptGenerate?.();}catch{}
}

export async function unloadLocalGeneral(){
  try{await engine?.unload?.();}catch{}
  engine=null;
  engineModel='';
  enginePromise=null;
}
