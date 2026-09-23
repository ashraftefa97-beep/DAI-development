const MODEL_CANDIDATES = [
  'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC',
  'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
] as const;

type ProgressCallback = (progress:number,label:string)=>void;
type DeltaCallback = (delta:string,full:string)=>void;

let engine:any=null;
let engineModel='';
let enginePromise:Promise<any>|null=null;
let progressListener:ProgressCallback|null=null;

export function localCoderSupported(){
  return typeof navigator!=='undefined' && 'gpu' in navigator;
}

export function localCoderModel(){
  return engineModel;
}

async function createEngine(onProgress?:ProgressCallback){
  if(engine)return engine;
  if(!localCoderSupported())throw new Error('WEBGPU_UNAVAILABLE');
  if(enginePromise){
    progressListener=onProgress||progressListener;
    return enginePromise;
  }

  progressListener=onProgress||null;

  enginePromise=(async()=>{
    try{
      const general=await import('./localGeneral');
      await general.unloadLocalGeneral();
    }catch{}
    const webllm=await import('@mlc-ai/web-llm');
    let lastError:any=null;

    for(const model of MODEL_CANDIDATES){
      try{
        progressListener?.(0,'ضي بتحضر محرك البرمجة المحلي…');
        const next=await webllm.CreateMLCEngine(model,{
          initProgressCallback:(report:any)=>{
            const raw=Number(report?.progress||0);
            const progress=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0;
            const label=String(report?.text||'ضي بتحضر محرك البرمجة المحلي…');
            progressListener?.(progress,label);
          }
        });
        engine=next;
        engineModel=model;
        progressListener?.(1,'محرك البرمجة المحلي جاهز');
        return next;
      }catch(error){
        lastError=error;
      }
    }

    enginePromise=null;
    throw lastError||new Error('LOCAL_CODER_INIT_FAILED');
  })();

  return enginePromise;
}

function historyToMessages(history:Array<{role:'user'|'assistant';content:string}>){
  return history.slice(-6).map(item=>({
    role:item.role==='assistant'?'assistant':'user',
    content:String(item.content||'').slice(0,5000)
  }));
}

export async function runLocalCoder(options:{
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
        'أنت محرك البرمجة داخل ضي. ركز على البرمجة، إصلاح الأخطاء، تصميم المواقع، HTML/CSS/JavaScript/TypeScript/React/Python/SQL وشرح الكود. '+
        'جاوب بالمصري الطبيعي لما المستخدم عربي. اكتب كود قابل للتشغيل، واذكر الملفات أو الخطوات المهمة بوضوح. '+
        'لو الطلب ناقص معلومة أساسية، اسأل سؤال واحد قصير. لا تدّعي إنك نفذت ملفات أو متصفح أو GitHub لو لم يحدث تنفيذ فعلي.'
    },
    ...historyToMessages(options.history||[]),
    {role:'user',content:options.prompt}
  ];

  const completion=await localEngine.chat.completions.create({
    messages,
    temperature:.15,
    top_p:.9,
    max_tokens:1400,
    stream:true
  });

  let full='';
  for await(const chunk of completion as any){
    const delta=String(chunk?.choices?.[0]?.delta?.content||'');
    if(!delta)continue;
    full+=delta;
    options.onDelta?.(delta,full);
  }

  return {text:full.trim(),model:engineModel};
}

export function stopLocalCoder(){
  try{engine?.interruptGenerate?.();}catch{}
}

export async function unloadLocalCoder(){
  try{await engine?.unload?.();}catch{}
  engine=null;
  engineModel='';
  enginePromise=null;
}
