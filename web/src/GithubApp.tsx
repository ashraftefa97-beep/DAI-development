import { useEffect, useRef, useState } from 'react';
import DaiFace, { type DaiState } from './DaiFace';
import { History, Mic, Plus, RotateCcw, Send, Settings, Square, Trash2, X } from 'lucide-react';
import { supabase, supabasePublishableKey, supabaseUrl } from './supabaseClient';

type Message = { id:string; role:'user'|'assistant'; content:string; createdAt:number };
type Conversation = { id:string; title:string; messages:Message[]; updatedAt:number };

type DesktopAction =
  | {type:'openApp';target:string}
  | {type:'focusApp';target:string}
  | {type:'closeApp';target:string}
  | {type:'media';key:'playPause'|'next'|'previous'|'stop'|'mute'|'volumeUp'|'volumeDown'}
  | {type:'shortcut';key:'space'|'enter'|'escape'|'left'|'right'|'up'|'down'|'pageUp'|'pageDown'|'home'|'end'|'fullscreen'|'find'|'address'}
  | {type:'openExternal';url:string};

declare global {
  interface Window {
    daiDesktop?: {
      isDesktop: boolean;
      platform?: string;
      capabilities: () => Promise<any>;
      execute: (action:DesktopAction) => Promise<{ok:boolean;message?:string}>;
      pickAndOpenFile: () => Promise<{ok:boolean;message?:string;canceled?:boolean}>;
      getStartup: () => Promise<boolean>;
      setStartup: (enabled:boolean) => Promise<boolean>;
    };
  }
}

function DaiLogo({className=''}:{className?:string}) {
  return <img src='./dai-logo.svg' className={className} alt='لوجو ضي' width={192} height={192}/>;
}

async function explainChatError(error:any){
  const context=error?.context;

  if(context && typeof context.clone==='function'){
    try {
      const response=context.clone();
      const status=Number(response.status||0);
      const payload=await response.json().catch(()=>null);
      const code=String(payload?.code||'');

      if(code==='GEMINI_CONFIG') return 'إعدادات ضي الذكية ناقصة حاليًا.';
      if(code==='GEMINI_AUTH') return 'ضي مش قادرة تتصل بخدمة الذكاء دلوقتي. راجع إعدادات الاتصال.';
      if(code==='GEMINI_MODEL') return 'خدمة ضي الذكية مش متاحة حاليًا. جرّب بعد شوية.';
      if(code==='GEMINI_QUOTA') return 'ضي وصلت لحد الاستخدام الحالي. جرّب تاني بعد شوية.';
      if(code==='GEMINI_RATE_LIMIT') return 'ضي عليها ضغط مؤقتًا. جرّب بعد شوية.';
      if(code==='GEMINI_OVERLOADED') return 'ضي عليها ضغط مؤقتًا. جرّب بعد شوية.';
      if(code==='GEMINI_TIMEOUT') return 'ضي اتأخرت في الرد. جرّب تاني.';
      if(code==='GEMINI_NETWORK') return 'ضي مش قادرة توصل لخدمة الذكاء حاليًا.';
      if(code==='GEMINI_BAD_REQUEST') return 'ضي واجهت مشكلة في فهم الطلب تقنيًا. جرّب تاني.';
      if(code==='AI_CONFIG') return 'إعدادات ضي الذكية ناقصة حاليًا.';
      if(code==='AI_AUTH') return 'ضي مش قادرة تتصل بخدمتها الذكية دلوقتي.';
      if(code==='AI_MODEL') return 'خدمة ضي الذكية مش متاحة حاليًا. جرّب بعد شوية.';
      if(code==='AI_QUOTA') return 'ضي وصلت لحد الاستخدام الحالي. جرّب تاني بعد شوية.';
      if(code==='AI_RATE_LIMIT') return 'ضي عليها ضغط مؤقتًا. جرّب بعد شوية.';
      if(code==='AI_OVERLOADED') return 'ضي عليها ضغط مؤقتًا. جرّب بعد شوية.';
      if(code==='AI_TIMEOUT') return 'ضي اتأخرت في الرد. جرّب تاني.';
      if(code==='AI_NETWORK') return 'ضي مش قادرة توصل للخدمة حاليًا.';
      if(code==='AI_BAD_REQUEST') return 'ضي واجهت مشكلة في فهم الطلب تقنيًا. جرّب تاني.';
      if(status===404) return 'خدمة ضي مش متاحة حاليًا.';
      if(status===401) return 'جلسة تسجيل الدخول انتهت. سجّل دخول من جديد.';
      if(status>=500) return 'ضي واجهت خطأ أثناء تجهيز الرد.';
    } catch {}
  }

  const message=String(error?.message||'');
  if(/Failed to send|fetch|network/i.test(message)) {
    return 'ضي مش قادرة تتصل بالخدمة حاليًا. جرّب تاني.';
  }
  return 'ضي حصل عندها خطأ غير متوقع. جرّب تاني.';
}

export default function GithubApp(){
  const [daiState,setDaiState]=useState<DaiState>('wave');
  const [reduced,setReduced]=useState(false);
  const [voiceEnabled,setVoiceEnabled]=useState(()=>{
    try { return localStorage.getItem('dai-voice-enabled')!=='0'; } catch { return true; }
  });
  const [input,setInput]=useState('');
  const [historyOpen,setHistoryOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [activeId,setActiveId]=useState('');
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [listening,setListening]=useState(false);
  const [voiceSessionActive,setVoiceSessionActive]=useState(false);
  const [voiceSessionStatus,setVoiceSessionStatus]=useState<'idle'|'connecting'|'listening'|'speaking'>('idle');
  const [files,setFiles]=useState<string[]>([]);
  const [loadingData,setLoadingData]=useState(true);
  const [sending,setSending]=useState(false);
  const [streamingText,setStreamingText]=useState(false);
  const [pendingUserMessage,setPendingUserMessage]=useState<Message|null>(null);
  const [errorText,setErrorText]=useState('');
  const [userId,setUserId]=useState('');
  const [userName,setUserName]=useState('');
  const [desktopMode,setDesktopMode]=useState(false);
  const [desktopStartup,setDesktopStartup]=useState(false);
  const timer=useRef<number|undefined>(undefined);
  const typingTimer=useRef<number|undefined>(undefined);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const speechRunRef=useRef(0);
  const textRequestAbortRef=useRef<AbortController|null>(null);
  const streamMessageIdRef=useRef('');
  const chatScrollRef=useRef<HTMLElement|null>(null);
  const recognitionRef=useRef<any>(null);
  const voiceTranscriptRef=useRef('');
  const keepListeningRef=useRef(false);
  const activeIdRef=useRef('');
  const voiceSessionActiveRef=useRef(false);
  const liveSocketRef=useRef<WebSocket|null>(null);
  const liveInputContextRef=useRef<AudioContext|null>(null);
  const liveOutputContextRef=useRef<AudioContext|null>(null);
  const liveStreamRef=useRef<MediaStream|null>(null);
  const liveProcessorRef=useRef<ScriptProcessorNode|null>(null);
  const liveInputSourceRef=useRef<MediaStreamAudioSourceNode|null>(null);
  const liveSilentGainRef=useRef<GainNode|null>(null);
  const liveOutputSourcesRef=useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveNextPlayTimeRef=useRef(0);
  const voiceSessionTurnsRef=useRef<Array<{role:'user'|'assistant';content:string}>>([]);
  const liveInputTranscriptRef=useRef('');
  const liveOutputTranscriptRef=useRef('');

  useEffect(()=>{ activeIdRef.current=activeId; },[activeId]);

  useEffect(()=>{
    let alive=true;
    async function detectDesktop(){
      if(!window.daiDesktop)return;
      try{
        const caps=await window.daiDesktop.capabilities();
        if(!alive||!caps?.ok)return;
        setDesktopMode(true);
        const startup=await window.daiDesktop.getStartup().catch(()=>false);
        if(alive)setDesktopStartup(Boolean(startup));
      }catch{}
    }
    detectDesktop();
    return()=>{alive=false;};
  },[]);

  function animate(state:DaiState,duration=2200){
    clearTimeout(timer.current);
    setDaiState(state);
    if(duration) timer.current=window.setTimeout(()=>setDaiState('idle'),duration);
  }

  function handleInputChange(value:string){
    setInput(value);
    if(listening||sending)return;
    clearTimeout(typingTimer.current);
    if(value.trim()){
      setDaiState('typing');
      typingTimer.current=window.setTimeout(()=>setDaiState('idle'),850);
    }else if(daiState==='typing'){
      setDaiState('idle');
    }
  }

  function stateForUserText(text:string):DaiState{
    if(/شكرا|شكرًا|تسلم|حلو|جميل|ممتاز|فرح|مبسوط/i.test(text))return 'happy';
    if(/بحب|حب|قلب|وحشت/i.test(text))return 'heart';
    if(/نعسان|نوم|نامي|تصبحي|تصبح/i.test(text))return 'sleep';
    if(/فكرة|اقتراح|صمم|اعمل|نخطط|خطة|ابداع/i.test(text))return 'idea';
    if(/بحث|دور|ابحث|مين|امتى|متى|فين|أين|اين|كام|كم|آخر|احدث|أحدث|search|latest/i.test(text))return 'search';
    return 'typing';
  }

  function stateForAssistantText(text:string):DaiState{
    if(/لقيت|وجدت|النتيجة|النتايج|اتأكدت|تأكدت/i.test(text))return 'found';
    if(/مبروك|ممتاز|جميل|حلو|تمام|نجح|اشتغل/i.test(text))return 'happy';
    if(/بحب|قلب|سعيدة|فرحانة/i.test(text))return 'heart';
    if(/فكرة|اقتراح|ممكن نعمل|أنسب حل|الخطة/i.test(text))return 'idea';
    return 'talk';
  }

  function pickArabicFemaleVoice(){
    if(!('speechSynthesis' in window)) return null;
    const voices=window.speechSynthesis.getVoices();
    const arabic=voices.filter(v=>/^ar\b/i.test(v.lang||''));
    if(!arabic.length)return null;

    const femaleHints=[
      'zariyah','hoda','salma','laila','layla','amira','female',
      'زريه','هدى','سلمى','ليلى','أميرة'
    ];

    const preferred=arabic
      .map(v=>{
        const name=(v.name||'').toLowerCase();
        const lang=(v.lang||'').toLowerCase();
        let score=0;
        if(femaleHints.some(h=>name.includes(h))) score+=100;
        if(name.includes('natural')||name.includes('online')) score+=30;
        if(lang==='ar-eg') score+=20;
        if(lang==='ar-sa') score+=15;
        return {v,score};
      })
      .sort((a,b)=>b.score-a.score);

    return preferred[0]?.v||arabic[0]||null;
  }

  function cleanForSpeech(text:string){
    return text
      .replace(/```[\s\S]*?```/g,' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
      .replace(/https?:\/\/\S+/g,' ')
      .replace(/[*_#>|~]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function speakBrowserFallback(text:string,onStart?:()=>void){
    if(!('speechSynthesis' in window))return false;
    const spoken=cleanForSpeech(text);
    if(!spoken)return false;

    const utterance=new SpeechSynthesisUtterance(spoken);
    const voice=pickArabicFemaleVoice();
    if(voice){
      utterance.voice=voice;
      utterance.lang=voice.lang||'ar-EG';
    }else{
      utterance.lang='ar-EG';
    }
    utterance.rate=0.96;
    utterance.pitch=1.08;
    utterance.volume=1;
    utterance.onstart=()=>{ clearTimeout(timer.current); setDaiState('talk'); onStart?.(); };
    utterance.onend=()=>setDaiState('idle');
    utterance.onerror=()=>setDaiState('idle');

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function base64ToAudioUrl(base64:string,mimeType='audio/wav'){
    const binary=atob(base64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes],{type:mimeType}));
  }

  function splitSpeechChunks(text:string){
    const firstLimit=220;
    const nextLimit=520;
    const sentences=(text.match(/[^.!?؟\n]+[.!?؟]?/g)||[text])
      .map(part=>part.trim())
      .filter(Boolean);
    const chunks:string[]=[];
    let current='';

    for(const sentence of sentences){
      const limit=chunks.length===0?firstLimit:nextLimit;
      if(!current){
        current=sentence;
        continue;
      }
      if((current+' '+sentence).length<=limit){
        current+=' '+sentence;
      }else{
        chunks.push(current);
        current=sentence;
      }
    }
    if(current)chunks.push(current);

    if(chunks[0]&&chunks[0].length>firstLimit){
      const first=chunks.shift()!;
      chunks.unshift(first.slice(firstLimit).trim());
      chunks.unshift(first.slice(0,firstLimit).trim());
    }

    return chunks.filter(Boolean);
  }

  async function requestTtsChunk(text:string){
    const {data,error}=await supabase!.functions.invoke('tts',{body:{text}});
    if(error)throw error;
    if(!data?.audioBase64)throw new Error('Gemini TTS returned no audio');
    return {
      audioBase64:String(data.audioBase64),
      mimeType:String(data.mimeType||'audio/wav')
    };
  }

  async function speakReply(text:string,onStart?:()=>void){
    if(!voiceEnabled||!supabase)return false;
    const spoken=cleanForSpeech(text).slice(0,2800);
    if(!spoken)return false;

    const chunks=splitSpeechChunks(spoken);
    if(!chunks.length)return false;

    const responseState=stateForAssistantText(text);
    animate(responseState,responseState==='talk'?0:1800);

    const runId=++speechRunRef.current;

    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.src='';
      audioRef.current=null;
    }

    const playChunk=async(index:number,prepared?:Promise<{audioBase64:string;mimeType:string}>):Promise<boolean>=>{
      if(runId!==speechRunRef.current)return false;

      try{
        const data=await (prepared||requestTtsChunk(chunks[index]));
        if(runId!==speechRunRef.current)return false;

        const nextPrepared=index+1<chunks.length
          ? requestTtsChunk(chunks[index+1])
          : undefined;

        const url=base64ToAudioUrl(data.audioBase64,data.mimeType);
        const audio=new Audio(url);
        audioRef.current=audio;

        audio.onplay=()=>{
          if(runId!==speechRunRef.current)return;
          clearTimeout(timer.current);
          setDaiState('talk');
          if(index===0)onStart?.();
        };

        audio.onended=()=>{
          URL.revokeObjectURL(url);
          if(audioRef.current===audio)audioRef.current=null;
          if(runId!==speechRunRef.current)return;

          if(index+1<chunks.length){
            void playChunk(index+1,nextPrepared);
            return;
          }

          const finishState=responseState==='talk'?'idle':responseState;
          if(finishState==='idle')setDaiState('idle');
          else animate(finishState,1100);
        };

        audio.onerror=()=>{
          URL.revokeObjectURL(url);
          if(audioRef.current===audio)audioRef.current=null;
          if(runId!==speechRunRef.current)return;
          const remaining=chunks.slice(index).join(' ');
          speakBrowserFallback(remaining,index===0?onStart:undefined);
        };

        await audio.play();
        return true;
      }catch(error){
        if(runId!==speechRunRef.current)return false;
        console.error('Gemini TTS chunk failed, using browser fallback',error);
        return speakBrowserFallback(chunks.slice(index).join(' '),index===0?onStart:undefined);
      }
    };

    return playChunk(0);
  }

  useEffect(()=>{
    try { localStorage.setItem('dai-voice-enabled',voiceEnabled?'1':'0'); } catch {}
    if(!voiceEnabled){
      speechRunRef.current++;
      if('speechSynthesis' in window)window.speechSynthesis.cancel();
      if(audioRef.current){
        audioRef.current.pause();
        audioRef.current.src='';
        audioRef.current=null;
      }
    }
  },[voiceEnabled]);

  useEffect(()=>{ animate('wave',2600); return()=>{
    clearTimeout(timer.current);
    clearTimeout(typingTimer.current);
    keepListeningRef.current=false;
    voiceSessionActiveRef.current=false;
    textRequestAbortRef.current?.abort();
    textRequestAbortRef.current=null;
    try{ recognitionRef.current?.stop(); }catch{}
    recognitionRef.current=null;
    try{ liveSocketRef.current?.close(); }catch{}
    liveSocketRef.current=null;
    speechRunRef.current++;
    if(liveProcessorRef.current)liveProcessorRef.current.onaudioprocess=null;
    liveStreamRef.current?.getTracks().forEach(track=>track.stop());
    liveStreamRef.current=null;
    stopLivePlayback();
    if('speechSynthesis' in window) window.speechSynthesis.cancel();
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.src='';
      audioRef.current=null;
    }
  }; },[]);

  useEffect(()=>{
    let alive=true;
    async function load(){
      if(!supabase) return;
      setLoadingData(true);
      setErrorText('');
      const { data: authData }=await supabase.auth.getUser();
      const uid=authData.user?.id||'';
      const displayName=String(
        authData.user?.user_metadata?.display_name ||
        authData.user?.user_metadata?.full_name ||
        authData.user?.user_metadata?.name ||
        ''
      ).trim();
      if(!alive)return;
      setUserId(uid);
      setUserName(displayName);
      if(!uid){setLoadingData(false);return;}

      const { data: rows, error }=await supabase
        .from('dai_conversations')
        .select('id,title,updated_at')
        .order('updated_at',{ascending:false});

      if(!alive)return;
      if(error){
        setErrorText('قاعدة بيانات المحادثات لسه محتاجة تجهيز في Supabase.');
        setLoadingData(false);
        return;
      }

      const base=(rows||[]).map((r:any)=>({
        id:r.id,
        title:r.title,
        updatedAt:new Date(r.updated_at).getTime(),
        messages:[] as Message[]
      }));
      setConversations(base);
      if(base[0]) setActiveId(base[0].id);
      setLoadingData(false);
    }
    load();
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    let alive=true;
    async function loadMessages(){
      if(!supabase||!activeId||sending||voiceSessionActive)return;
      const { data, error }=await supabase
        .from('dai_messages')
        .select('id,role,content,created_at')
        .eq('conversation_id',activeId)
        .order('created_at',{ascending:true});
      if(!alive)return;
      if(error){setErrorText('تعذر تحميل رسائل المحادثة.');return;}
      const messages=(data||[]).map((m:any)=>({
        id:m.id,
        role:m.role as 'user'|'assistant',
        content:m.content,
        createdAt:new Date(m.created_at).getTime()
      }));
      setConversations(prev=>prev.map(c=>c.id===activeId?{...c,messages}:c));
    }
    loadMessages();
    return()=>{alive=false;};
  },[activeId,sending,voiceSessionActive]);

  const active=conversations.find(c=>c.id===activeId)||null;

  useEffect(()=>{
    const node=chatScrollRef.current;
    if(!node)return;
    requestAnimationFrame(()=>node.scrollTo({top:node.scrollHeight,behavior:'smooth'}));
  },[activeId,active?.messages.length,pendingUserMessage?.id,sending]);

  async function createConversation(title='محادثة جديدة'){
    if(!supabase||!userId)return null;
    const { data, error }=await supabase
      .from('dai_conversations')
      .insert({user_id:userId,title})
      .select('id,title,updated_at')
      .single();
    if(error){setErrorText('تعذر إنشاء المحادثة.');return null;}
    const c:Conversation={id:data.id,title:data.title,updatedAt:new Date(data.updated_at).getTime(),messages:[]};
    setConversations(prev=>[c,...prev]);
    setActiveId(c.id);
    return c.id;
  }

  function cleanDesktopTarget(value:string){
    return value
      .replace(/[؟?!.,،]+$/g,'')
      .replace(/\b(?:لو سمحت|من فضلك|دلوقتي|كده|كدا)\b/gi,'')
      .trim()
      .slice(0,120);
  }

  async function runDesktopCommand(text:string){
    const bridge=window.daiDesktop;
    if(!bridge?.isDesktop)return '';

    const normalized=text.trim();
    const lower=normalized.toLowerCase();

    try{
      if(/(?:افتح|اختار).*(?:ملف|فيديو|اغنية|أغنية|صوت|مقطع).*(?:الجهاز|الكمبيوتر)|(?:ملف|فيديو|صوت).*من الجهاز/i.test(normalized)){
        const result=await bridge.pickAndOpenFile();
        if(result?.canceled)return 'المستخدم ألغى اختيار الملف.';
        return result?.ok ? (result.message||'ضي فتحت الملف المحلي.') : ('ضي حاولت تفتح الملف لكن: '+(result?.message||'حصل خطأ.'));
      }

      if(/(?:ارفع|علي|زوّد|زود).*(?:الصوت|الصوت شوية|volume)|volume up/i.test(normalized)){
        const result=await bridge.execute({type:'media',key:'volumeUp'});
        return result.ok?'ضي رفعت صوت الجهاز.':('ضي مقدرتش ترفع الصوت: '+(result.message||'خطأ.'));
      }
      if(/(?:وطي|قلل|خفّض|خفض).*(?:الصوت|volume)|volume down/i.test(normalized)){
        const result=await bridge.execute({type:'media',key:'volumeDown'});
        return result.ok?'ضي وطت صوت الجهاز.':('ضي مقدرتش توطي الصوت: '+(result.message||'خطأ.'));
      }
      if(/(?:اكتم|mute|اقفل الصوت|اقفلي الصوت)/i.test(normalized)){
        const result=await bridge.execute({type:'media',key:'mute'});
        return result.ok?'ضي بدلت حالة كتم الصوت.':('ضي مقدرتش تتحكم في الكتم: '+(result.message||'خطأ.'));
      }
      if(/(?:التالي|الاغنية الجاية|الأغنية الجاية|next track|next song)/i.test(normalized)){
        const result=await bridge.execute({type:'media',key:'next'});
        return result.ok?'ضي نقلت للمقطع التالي.':('ضي مقدرتش تنقل للمقطع التالي: '+(result.message||'خطأ.'));
      }
      if(/(?:السابق|اللي قبله|previous track|previous song)/i.test(normalized)){
        const result=await bridge.execute({type:'media',key:'previous'});
        return result.ok?'ضي رجعت للمقطع السابق.':('ضي مقدرتش ترجع للمقطع السابق: '+(result.message||'خطأ.'));
      }
      if(/(?:وقف|وقفي|كمل|كملي|شغل|شغلي|pause|resume|play).*(?:الفيديو|المقطع|الصوت|الموسيقى|الاغنية|الأغنية)|(?:pause|resume|play)$/i.test(normalized)){
        const result=await bridge.execute({type:'media',key:'playPause'});
        return result.ok?'ضي بدلت تشغيل/إيقاف الميديا.':('ضي مقدرتش تتحكم في التشغيل: '+(result.message||'خطأ.'));
      }
      if(/(?:قدم|قدمي|عدي|عدّي).*(?:الفيديو|المقطع)|seek forward/i.test(normalized)){
        const result=await bridge.execute({type:'shortcut',key:'right'});
        return result.ok?'ضي قدمت المقطع.':('ضي مقدرتش تقدم المقطع: '+(result.message||'خطأ.'));
      }
      if(/(?:رجع|رجعي).*(?:الفيديو|المقطع)|seek back/i.test(normalized)){
        const result=await bridge.execute({type:'shortcut',key:'left'});
        return result.ok?'ضي رجعت المقطع.':('ضي مقدرتش ترجع المقطع: '+(result.message||'خطأ.'));
      }
      if(/(?:ملء الشاشة|فل سكرين|fullscreen)/i.test(normalized)){
        const result=await bridge.execute({type:'shortcut',key:'fullscreen'});
        return result.ok?'ضي بدلت وضع ملء الشاشة.':('ضي مقدرتش تغير وضع الشاشة: '+(result.message||'خطأ.'));
      }

      const webAliases:Array<[RegExp,string]>=[
        [/^(?:افتح|افتحي)\s+(?:موقع\s+)?يوتيوب$/i,'https://www.youtube.com/'],
        [/^(?:افتح|افتحي)\s+(?:موقع\s+)?جوجل$/i,'https://www.google.com/'],
        [/^(?:افتح|افتحي)\s+(?:موقع\s+)?جيميل$/i,'https://mail.google.com/'],
        [/^(?:افتح|افتحي)\s+(?:واتساب ويب|whatsapp web)$/i,'https://web.whatsapp.com/'],
      ];
      for(const [pattern,url] of webAliases){
        if(pattern.test(normalized)){
          const result=await bridge.execute({type:'openExternal',url});
          return result.ok?'ضي فتحت الموقع.':('ضي مقدرتش تفتح الموقع: '+(result.message||'خطأ.'));
        }
      }

      const closeMatch=normalized.match(/^(?:اقفل|اقفلي|اغلق|اغلقي|close)\s+(?:برنامج\s+)?(.+)$/i);
      if(closeMatch){
        const target=cleanDesktopTarget(closeMatch[1]);
        if(!target)return '';
        if(!window.confirm('تقفل '+target+'؟'))return 'المستخدم ألغى إغلاق البرنامج.';
        const result=await bridge.execute({type:'closeApp',target});
        return result.ok?(result.message||('ضي قفلت '+target+'.')):('ضي مقدرتش تقفل '+target+': '+(result.message||'خطأ.'));
      }

      const focusMatch=normalized.match(/^(?:روح|روحي|ركز|ركزي|حول|حولي)\s+(?:على|ل)?\s*(?:برنامج\s+)?(.+)$/i);
      if(focusMatch){
        const target=cleanDesktopTarget(focusMatch[1]);
        if(!target)return '';
        const result=await bridge.execute({type:'focusApp',target});
        return result.ok?(result.message||('ضي راحت لبرنامج '+target+'.')):('ضي مقدرتش تركز على '+target+': '+(result.message||'خطأ.'));
      }

      const openMatch=normalized.match(/^(?:افتح|افتحي|شغل|شغلي|open|launch)\s+(?:برنامج\s+)?(.+)$/i);
      if(openMatch){
        const target=cleanDesktopTarget(openMatch[1]);
        if(!target)return '';
        const result=await bridge.execute({type:'openApp',target});
        return result.ok?(result.message||('ضي فتحت '+target+'.')):('ضي ملقتش '+target+' أو مقدرتش تفتحه: '+(result.message||'خطأ.'));
      }

      if(/^https?:\/\//i.test(lower)){
        const result=await bridge.execute({type:'openExternal',url:normalized});
        return result.ok?'ضي فتحت الرابط.':('ضي مقدرتش تفتح الرابط: '+(result.message||'خطأ.'));
      }
    }catch(error){
      console.error('DAI desktop action failed',error);
      return 'ضي حاولت تنفذ أمر على الكمبيوتر لكن حصل خطأ محلي.';
    }

    return '';
  }

  function stopTextReply(){
    textRequestAbortRef.current?.abort();
    textRequestAbortRef.current=null;
    const tempId=streamMessageIdRef.current;
    if(tempId){
      setConversations(prev=>prev.map(conversation=>({
        ...conversation,
        messages:conversation.messages.filter(message=>message.id!==tempId)
      })));
    }
    streamMessageIdRef.current='';
    setPendingUserMessage(null);
    setStreamingText(false);
    setSending(false);
    animate('idle',0);
  }

  async function streamTypedReply(
    text:string,
    desktopActionResult='',
    regenerateAssistantId=''
  ){
    if(!supabase||!supabaseUrl||!supabasePublishableKey)throw new Error('stream-config');

    textRequestAbortRef.current?.abort();
    const controller=new AbortController();
    textRequestAbortRef.current=controller;
    const tempAssistantId='stream-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    streamMessageIdRef.current=tempAssistantId;

    const {data:{session}}=await supabase.auth.getSession();
    const token=session?.access_token||'';
    if(!token)throw new Error('session');

    const response=await fetch(supabaseUrl.replace(/\/$/,'')+'/functions/v1/chat-stream',{
      method:'POST',
      signal:controller.signal,
      headers:{
        Authorization:'Bearer '+token,
        apikey:supabasePublishableKey,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        conversationId:activeIdRef.current||null,
        message:text,
        desktopActionResult:desktopActionResult||null,
        regenerateAssistantId:regenerateAssistantId||null
      })
    });

    if(!response.ok||!response.body){
      const payload=await response.json().catch(()=>null);
      throw new Error(String(payload?.message||payload?.error||'stream-failed'));
    }

    const reader=response.body.getReader();
    const decoder=new TextDecoder();
    let buffer='';
    let conversationId=activeIdRef.current;
    let doneReceived=false;
    let firstDelta=false;

    const handleEvent=(eventName:string,payload:any)=>{
      if(eventName==='start'){
        conversationId=String(payload?.conversationId||conversationId||'');
        if(!conversationId)return;
        activeIdRef.current=conversationId;
        setActiveId(conversationId);

        const row=payload?.userMessage;
        if(row){
          const userMessage:Message={
            id:String(row.id),
            role:'user',
            content:String(row.content||text),
            createdAt:new Date(row.created_at).getTime()
          };
          setPendingUserMessage(null);
          setConversations(prev=>{
            const existing=prev.find(item=>item.id===conversationId);
            const base=existing?.messages||[];
            const messages=[
              ...base.filter(message=>message.id!==userMessage.id),
              userMessage
            ];
            const updated:Conversation=existing
              ? {...existing,messages,updatedAt:Date.now()}
              : {id:conversationId,title:text.slice(0,48)||'محادثة جديدة',messages,updatedAt:Date.now()};
            return [updated,...prev.filter(item=>item.id!==conversationId)];
          });
        }
        return;
      }

      if(eventName==='delta'){
        const delta=String(payload?.text||'');
        if(!delta||!conversationId)return;

        if(!firstDelta){
          firstDelta=true;
          setStreamingText(true);
          animate('reply',0);
        }

        setConversations(prev=>{
          const existing=prev.find(item=>item.id===conversationId);
          if(!existing)return prev;
          const found=existing.messages.some(message=>message.id===tempAssistantId);
          const messages=found
            ? existing.messages.map(message=>
                message.id===tempAssistantId
                  ? {...message,content:message.content+delta}
                  : message
              )
            : [...existing.messages,{
                id:tempAssistantId,
                role:'assistant' as const,
                content:delta,
                createdAt:Date.now()
              }];
          const updated={...existing,messages,updatedAt:Date.now()};
          return [updated,...prev.filter(item=>item.id!==conversationId)];
        });
        return;
      }

      if(eventName==='done'){
        doneReceived=true;
        const row=payload?.assistantMessage;
        if(!row||!conversationId)return;

        const assistantMessage:Message={
          id:String(row.id),
          role:'assistant',
          content:String(row.content||''),
          createdAt:new Date(row.created_at).getTime()
        };

        setConversations(prev=>prev.map(item=>{
          if(item.id!==conversationId)return item;
          const withoutOld=item.messages.filter(message=>
            message.id!==tempAssistantId &&
            (!regenerateAssistantId||message.id!==regenerateAssistantId)
          );
          return {...item,messages:[...withoutOld,assistantMessage],updatedAt:Date.now()};
        }));

        const perf=payload?.performance;
        if(perf&&typeof perf==='object'){
          console.debug('DAI latency',{
            firstTokenMs:Number(perf.firstTokenMs||0),
            totalMs:Number(perf.totalMs||0),
            fastPath:Boolean(perf.fastPath)
          });
        }

        streamMessageIdRef.current='';
        setStreamingText(false);
        animate('reply',900);
        return;
      }

      if(eventName==='error'){
        throw new Error(String(payload?.message||'ضي واجهت مشكلة وهي بتجهز الرد.'));
      }
    };

    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const frames=buffer.split(/\r?\n\r?\n/);
      buffer=frames.pop()||'';

      for(const frame of frames){
        let eventName='message';
        const dataLines:string[]=[];
        for(const line of frame.split(/\r?\n/)){
          if(line.startsWith('event:'))eventName=line.slice(6).trim();
          else if(line.startsWith('data:'))dataLines.push(line.slice(5).trim());
        }
        if(!dataLines.length)continue;
        let payload:any;
        try{payload=JSON.parse(dataLines.join('\n'));}catch{continue;}
        handleEvent(eventName,payload);
      }
    }

    if(!doneReceived&&!controller.signal.aborted){
      throw new Error('الرد اتوقف قبل ما يكتمل.');
    }
  }

  async function regenerateLastReply(){
    if(!active||sending||voiceSessionActive)return;
    const messages=active.messages;
    let assistantIndex=-1;
    for(let index=messages.length-1;index>=0;index--){
      if(messages[index].role==='assistant'){assistantIndex=index;break;}
    }
    if(assistantIndex<0)return;

    let userIndex=-1;
    for(let index=assistantIndex-1;index>=0;index--){
      if(messages[index].role==='user'){userIndex=index;break;}
    }
    if(userIndex<0)return;

    const oldAssistant=messages[assistantIndex];
    const userText=messages[userIndex].content;
    setErrorText('');
    setSending(true);
    setStreamingText(false);
    setConversations(prev=>prev.map(item=>
      item.id===active.id
        ? {...item,messages:item.messages.filter(message=>message.id!==oldAssistant.id)}
        : item
    ));

    try{
      await streamTypedReply(userText,'',oldAssistant.id);
    }catch(error){
      if((error as Error)?.name!=='AbortError'){
        setErrorText(String((error as Error)?.message||'ضي مقدرتش تعيد الرد دلوقتي.'));
      }
      setConversations(prev=>prev.map(item=>{
        if(item.id!==active.id||item.messages.some(message=>message.id===oldAssistant.id))return item;
        return {...item,messages:[...item.messages,oldAssistant].sort((a,b)=>a.createdAt-b.createdAt)};
      }));
      const tempId=streamMessageIdRef.current;
      if(tempId){
        setConversations(prev=>prev.map(item=>({
          ...item,
          messages:item.messages.filter(message=>message.id!==tempId)
        })));
      }
    }finally{
      if(textRequestAbortRef.current?.signal.aborted||textRequestAbortRef.current){
        textRequestAbortRef.current=null;
      }
      streamMessageIdRef.current='';
      setStreamingText(false);
      setSending(false);
    }
  }

  async function sendMessage(messageOverride?:unknown){
    const fromVoice=typeof messageOverride==='string';
    const text=(fromVoice?messageOverride:input).trim();
    if(!text||!supabase||loadingData||sending)return;
    if(!fromVoice)setInput('');
    clearTimeout(typingTimer.current);
    setErrorText('');
    setSending(true);
    setStreamingText(false);

    const optimisticMessage:Message={
      id:'pending-'+Date.now(),
      role:'user',
      content:text,
      createdAt:Date.now()
    };
    setPendingUserMessage(optimisticMessage);
    animate(stateForUserText(text),0);

    let desktopActionResult='';
    if(desktopMode){
      desktopActionResult=await runDesktopCommand(text);
    }

    if(!fromVoice){
      try{
        await streamTypedReply(text,desktopActionResult);
      }catch(error){
        const aborted=(error as Error)?.name==='AbortError';
        const tempId=streamMessageIdRef.current;
        if(tempId){
          setConversations(prev=>prev.map(item=>({
            ...item,
            messages:item.messages.filter(message=>message.id!==tempId)
          })));
        }
        if(!aborted){
          setInput(text);
          setErrorText(String((error as Error)?.message||'ضي حصل عندها خطأ وهي بتجهز الرد.'));
        }
        animate('idle',0);
      }finally{
        textRequestAbortRef.current=null;
        streamMessageIdRef.current='';
        setPendingUserMessage(null);
        setStreamingText(false);
        setSending(false);
      }
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          conversationId: activeId || null,
          message: text,
          desktopActionResult: desktopActionResult || null,
        },
      });

      if(error) throw error;
      if(!data?.assistantMessage) throw new Error('empty');

      const conversationId=String(data.conversationId);
      const userRow=data.userMessage;
      const assistantRow=data.assistantMessage;
      const userMessage:Message={
        id:userRow.id,
        role:'user',
        content:userRow.content,
        createdAt:new Date(userRow.created_at).getTime()
      };
      const assistantMessage:Message={
        id:assistantRow.id,
        role:'assistant',
        content:assistantRow.content,
        createdAt:new Date(assistantRow.created_at).getTime()
      };

      setPendingUserMessage(null);
      setActiveId(conversationId);

      setConversations(prev=>{
        const existing=prev.find(item=>item.id===conversationId);
        const baseMessages=existing?.messages||[];
        const withoutDuplicate=baseMessages.filter(message=>message.id!==userMessage.id&&message.id!==assistantMessage.id);
        const updated:Conversation=existing
          ? {...existing,messages:[...withoutDuplicate,userMessage],updatedAt:Date.now()}
          : {id:conversationId,title:text.slice(0,48)||'محادثة جديدة',messages:[userMessage],updatedAt:Date.now()};
        return [updated,...prev.filter(item=>item.id!==conversationId)];
      });

      let revealed=false;
      const revealAssistant=()=>{
        if(revealed)return;
        revealed=true;
        setConversations(prev=>prev.map(item=>
          item.id===conversationId && !item.messages.some(message=>message.id===assistantMessage.id)
            ? {...item,messages:[...item.messages,assistantMessage],updatedAt:Date.now()}
            : item
        ));
      };

      const answerState=stateForAssistantText(assistantMessage.content);
      animate(answerState,answerState==='talk'?0:1600);

      if(voiceEnabled){
        const speaking=await speakReply(assistantMessage.content,revealAssistant);
        if(!speaking)revealAssistant();
      }else{
        revealAssistant();
      }
    } catch (error) {
      console.error('DAI chat failed', error);
      setPendingUserMessage(null);
      setErrorText(await explainChatError(error));
      animate('idle',0);
    } finally {
      setSending(false);
    }
  }

  function pcm16ToBase64(samples:Float32Array){
    const pcm=new Int16Array(samples.length);
    for(let i=0;i<samples.length;i++){
      const value=Math.max(-1,Math.min(1,samples[i]));
      pcm[i]=value<0?value*0x8000:value*0x7fff;
    }
    const bytes=new Uint8Array(pcm.buffer);
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk){
      binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
    }
    return btoa(binary);
  }

  function base64PcmToFloat32(base64:string){
    const binary=atob(base64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const view=new DataView(bytes.buffer);
    const output=new Float32Array(Math.floor(bytes.byteLength/2));
    for(let i=0;i<output.length;i++)output[i]=view.getInt16(i*2,true)/32768;
    return output;
  }

  function stopLivePlayback(){
    for(const source of liveOutputSourcesRef.current){
      try{source.stop();}catch{}
    }
    liveOutputSourcesRef.current.clear();
    liveNextPlayTimeRef.current=0;
  }

  function playLiveAudio(base64:string){
    const ctx=liveOutputContextRef.current;
    if(!ctx)return;
    const samples=base64PcmToFloat32(base64);
    if(!samples.length)return;

    const buffer=ctx.createBuffer(1,samples.length,24000);
    buffer.copyToChannel(samples,0);
    const source=ctx.createBufferSource();
    source.buffer=buffer;
    source.connect(ctx.destination);

    const startAt=Math.max(ctx.currentTime+.025,liveNextPlayTimeRef.current||0);
    source.start(startAt);
    liveNextPlayTimeRef.current=startAt+buffer.duration;
    liveOutputSourcesRef.current.add(source);
    source.onended=()=>liveOutputSourcesRef.current.delete(source);

    setVoiceSessionStatus('speaking');
    animate('talk',0);
  }

  async function startLiveCapture(socket:WebSocket){
    const stream=await navigator.mediaDevices.getUserMedia({
      audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}
    });
    if(!voiceSessionActiveRef.current){
      stream.getTracks().forEach(track=>track.stop());
      return;
    }

    const ctx=new AudioContext();
    await ctx.resume();
    const source=ctx.createMediaStreamSource(stream);
    const processor=ctx.createScriptProcessor(4096,1,1);
    const silent=ctx.createGain();
    silent.gain.value=0;

    source.connect(processor);
    processor.connect(silent);
    silent.connect(ctx.destination);

    liveStreamRef.current=stream;
    liveInputContextRef.current=ctx;
    liveInputSourceRef.current=source;
    liveProcessorRef.current=processor;
    liveSilentGainRef.current=silent;

    processor.onaudioprocess=(event)=>{
      if(!voiceSessionActiveRef.current||socket.readyState!==WebSocket.OPEN)return;
      const channel=event.inputBuffer.getChannelData(0);
      const audioData=pcm16ToBase64(channel);
      socket.send(JSON.stringify({
        realtimeInput:{
          audio:{
            data:audioData,
            mimeType:'audio/pcm;rate='+ctx.sampleRate
          }
        }
      }));
    };

    setListening(true);
    setVoiceSessionStatus('listening');
    animate('listen',0);
  }

  async function persistVoiceTranscript(turns:Array<{role:'user'|'assistant';content:string}>){
    if(!supabase||!userId)return;
    const cleaned=turns
      .map(turn=>({...turn,content:turn.content.trim()}))
      .filter(turn=>turn.content);
    if(!cleaned.length)return;

    let conversationId=activeIdRef.current;
    if(!conversationId){
      const firstUser=cleaned.find(turn=>turn.role==='user')?.content||'محادثة صوتية';
      const {data,error}=await supabase
        .from('dai_conversations')
        .insert({user_id:userId,title:firstUser.slice(0,48)||'محادثة صوتية'})
        .select('id,title,updated_at')
        .single();
      if(error||!data)throw error||new Error('conversation');
      conversationId=String(data.id);
      activeIdRef.current=conversationId;
      setActiveId(conversationId);
      setConversations(prev=>[
        {id:conversationId,title:data.title,updatedAt:new Date(data.updated_at).getTime(),messages:[]},
        ...prev.filter(c=>c.id!==conversationId)
      ]);
    }

    const {data,error}=await supabase
      .from('dai_messages')
      .insert(cleaned.map(turn=>({
        conversation_id:conversationId,
        user_id:userId,
        role:turn.role,
        content:turn.content
      })))
      .select('id,role,content,created_at');

    if(error||!data)throw error||new Error('messages');

    const saved:Message[]=data.map((row:any)=>({
      id:String(row.id),
      role:row.role as 'user'|'assistant',
      content:String(row.content),
      createdAt:new Date(row.created_at).getTime()
    }));

    await supabase
      .from('dai_conversations')
      .update({updated_at:new Date().toISOString()})
      .eq('id',conversationId);

    setConversations(prev=>{
      const existing=prev.find(c=>c.id===conversationId);
      const base=existing?.messages||[];
      const ids=new Set(base.map(m=>m.id));
      const merged=[...base,...saved.filter(m=>!ids.has(m.id))].sort((a,b)=>a.createdAt-b.createdAt);
      const updated:Conversation=existing
        ? {...existing,messages:merged,updatedAt:Date.now()}
        : {id:conversationId,title:cleaned[0]?.content.slice(0,48)||'محادثة صوتية',messages:merged,updatedAt:Date.now()};
      return [updated,...prev.filter(c=>c.id!==conversationId)];
    });
  }

  function finishLiveTurn(){
    const userText=liveInputTranscriptRef.current.trim();
    const daiText=liveOutputTranscriptRef.current.trim();
    if(userText)voiceSessionTurnsRef.current.push({role:'user',content:userText});
    if(daiText)voiceSessionTurnsRef.current.push({role:'assistant',content:daiText});
    liveInputTranscriptRef.current='';
    liveOutputTranscriptRef.current='';
  }

  async function endLiveVoice(){
    if(!voiceSessionActiveRef.current)return;
    voiceSessionActiveRef.current=false;
    setVoiceSessionActive(false);
    setVoiceSessionStatus('idle');
    setListening(false);

    finishLiveTurn();

    const socket=liveSocketRef.current;
    liveSocketRef.current=null;
    if(socket&&socket.readyState===WebSocket.OPEN){
      try{socket.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));}catch{}
      try{socket.close(1000,'user-ended');}catch{}
    }

    if(liveProcessorRef.current)liveProcessorRef.current.onaudioprocess=null;
    try{liveInputSourceRef.current?.disconnect();}catch{}
    try{liveProcessorRef.current?.disconnect();}catch{}
    try{liveSilentGainRef.current?.disconnect();}catch{}
    liveStreamRef.current?.getTracks().forEach(track=>track.stop());
    liveStreamRef.current=null;
    liveInputSourceRef.current=null;
    liveProcessorRef.current=null;
    liveSilentGainRef.current=null;
    if(liveInputContextRef.current){
      try{await liveInputContextRef.current.close();}catch{}
      liveInputContextRef.current=null;
    }

    stopLivePlayback();
    if(liveOutputContextRef.current){
      try{await liveOutputContextRef.current.close();}catch{}
      liveOutputContextRef.current=null;
    }

    const turns=[...voiceSessionTurnsRef.current];
    voiceSessionTurnsRef.current=[];
    animate('idle',0);

    if(turns.length){
      try{
        await persistVoiceTranscript(turns);
      }catch(error){
        console.error('DAI voice transcript save failed',error);
        setErrorText('ضي خلصت الحوار الصوتي، لكن حصل خطأ وهي بتحفظ نص المحادثة.');
      }
    }
  }

  async function executeLiveDesktopTool(name:string,args:any){
    const bridge=window.daiDesktop;
    if(!bridge?.isDesktop)return {ok:false,message:'نسخة الويب لا تملك تحكمًا محليًا في الكمبيوتر.'};

    try{
      if(name==='open_program'){
        const target=cleanDesktopTarget(String(args?.name||''));
        return target ? await bridge.execute({type:'openApp',target}) : {ok:false,message:'اسم البرنامج ناقص.'};
      }
      if(name==='focus_program'){
        const target=cleanDesktopTarget(String(args?.name||''));
        return target ? await bridge.execute({type:'focusApp',target}) : {ok:false,message:'اسم البرنامج ناقص.'};
      }
      if(name==='close_program'){
        const target=cleanDesktopTarget(String(args?.name||''));
        if(!target)return {ok:false,message:'اسم البرنامج ناقص.'};
        if(!window.confirm('تقفل '+target+'؟'))return {ok:false,message:'المستخدم ألغى إغلاق البرنامج.'};
        return await bridge.execute({type:'closeApp',target});
      }
      if(name==='media_control'){
        const key=String(args?.command||'') as 'playPause'|'next'|'previous'|'stop'|'mute'|'volumeUp'|'volumeDown';
        if(!['playPause','next','previous','stop','mute','volumeUp','volumeDown'].includes(key)){
          return {ok:false,message:'أمر الميديا غير معروف.'};
        }
        return await bridge.execute({type:'media',key});
      }
      if(name==='press_key'){
        const key=String(args?.key||'') as DesktopAction extends {type:'shortcut';key:infer K}?K:never;
        const allowed=['space','enter','escape','left','right','up','down','pageUp','pageDown','home','end','fullscreen','find','address'];
        if(!allowed.includes(String(key)))return {ok:false,message:'الاختصار غير مسموح.'};
        return await bridge.execute({type:'shortcut',key:key as any});
      }
      if(name==='open_website'){
        const url=String(args?.url||'').trim();
        if(!/^https?:\/\//i.test(url))return {ok:false,message:'الرابط غير صحيح.'};
        return await bridge.execute({type:'openExternal',url});
      }
      if(name==='open_local_file'){
        return await bridge.pickAndOpenFile();
      }
    }catch(error){
      console.error('DAI live desktop tool failed',error);
      return {ok:false,message:'حصل خطأ محلي أثناء تنفيذ الأمر.'};
    }

    return {ok:false,message:'الأمر المحلي غير معروف.'};
  }

  async function startLiveVoice(){
    if(!supabase||loadingData||sending||voiceSessionActiveRef.current)return;
    if(!navigator.mediaDevices?.getUserMedia){
      setErrorText('المتصفح ده مش بيدعم المحادثة الصوتية.');
      return;
    }

    setErrorText('');
    setVoiceSessionStatus('connecting');
    setVoiceSessionActive(true);
    voiceSessionActiveRef.current=true;
    voiceSessionTurnsRef.current=[];
    liveInputTranscriptRef.current='';
    liveOutputTranscriptRef.current='';

    try{
      const outputCtx=new AudioContext();
      await outputCtx.resume();
      liveOutputContextRef.current=outputCtx;

      const {data,error}=await supabase.functions.invoke('live-token',{body:{}});
      if(error||!data?.token)throw error||new Error('voice-token');

      const token=String(data.token);
      const model=String(data.model||'gemini-3.8-live');
      const currentName=String(data.userName||userName||'صاحب الحساب').trim();
      const currentFirstName=currentName.split(/\s+/).filter(Boolean)[0]||'صاحب الحساب';
      const currentGender=String(data.userGender||'unspecified');
      const socket=new WebSocket(
        'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?access_token='+encodeURIComponent(token)
      );
      liveSocketRef.current=socket;

      socket.onopen=()=>{
        const desktopToolDeclarations=desktopMode ? [{
          functionDeclarations:[
            {
              name:'open_program',
              description:'افتح برنامج مثبت على Windows عندما يطلب المستخدم ذلك.',
              parameters:{type:'OBJECT',properties:{name:{type:'STRING',description:'اسم البرنامج'}},required:['name']}
            },
            {
              name:'focus_program',
              description:'حوّل التركيز إلى نافذة برنامج مفتوحة.',
              parameters:{type:'OBJECT',properties:{name:{type:'STRING',description:'اسم البرنامج أو النافذة'}},required:['name']}
            },
            {
              name:'close_program',
              description:'اطلب إغلاق برنامج مفتوح إغلاقًا عاديًا. يحتاج تأكيد المستخدم محليًا.',
              parameters:{type:'OBJECT',properties:{name:{type:'STRING',description:'اسم البرنامج'}},required:['name']}
            },
            {
              name:'media_control',
              description:'تحكم في تشغيل الوسائط أو صوت Windows.',
              parameters:{
                type:'OBJECT',
                properties:{
                  command:{
                    type:'STRING',
                    enum:['playPause','next','previous','stop','mute','volumeUp','volumeDown'],
                    description:'أمر التحكم في الوسائط'
                  }
                },
                required:['command']
              }
            },
            {
              name:'press_key',
              description:'نفّذ اختصار تنقل آمن في البرنامج النشط، مثل تقديم الفيديو أو ملء الشاشة.',
              parameters:{
                type:'OBJECT',
                properties:{
                  key:{
                    type:'STRING',
                    enum:['space','enter','escape','left','right','up','down','pageUp','pageDown','home','end','fullscreen','find','address']
                  }
                },
                required:['key']
              }
            },
            {
              name:'open_website',
              description:'افتح رابط http أو https في المتصفح الافتراضي.',
              parameters:{type:'OBJECT',properties:{url:{type:'STRING'}},required:['url']}
            },
            {
              name:'open_local_file',
              description:'افتح نافذة اختيار ملف محلي ليختار المستخدم فيديو أو صوت أو ملفًا آخر.',
              parameters:{type:'OBJECT',properties:{}}
            }
          ]
        }] : undefined;

        const genderRule=currentGender==='male'
          ? 'المستخدم ذكر؛ خاطبيه بصيغة المذكر عند الحاجة. '
          : currentGender==='female'
            ? 'المستخدمة أنثى؛ خاطبيها بصيغة المؤنث عند الحاجة. '
            : 'جنس المستخدم غير محدد؛ تجنبي افتراض الجنس قدر الإمكان. ';

        const systemText=
          'أنت ضي، مساعدة صوتية أنثوية ودودة وسريعة. اسم المستخدم الأول هو «'+currentFirstName+'». '+
          'اتكلمي بالعربية المصرية بشكل طبيعي ومرن ومختصر، كحوار عادي مش رد خدمة عملاء. '+
          'ما تبدأيش كل رد بتحية أو باسم المستخدم. استخدمي الاسم الأول أحيانًا فقط لما يضيف ود أو وضوح، وما تستخدميش الاسم الكامل في الرد. '+
          'لو المستخدم قال «إزيك» أو سلّم عليكي، ردي بتحية طبيعية قصيرة ومتنوعة بدل جملة محفوظة. '+
          'تجنبي عبارات آلية متكررة زي «أقدر أساعدك بإيه النهارده؟» إلا لو السياق فعلًا محتاج سؤال متابعة. '+
          genderRule+
          'لا تذكري أسماء مستخدمين آخرين. '+
          'لا تستخدمي لقب «أشروفي» إلا إذا نطق المستخدم كلمة «أشروفي» أو سأل عنها صراحة في نفس الحوار. '+
          (desktopMode
            ? 'أنتِ داخل برنامج ضي على Windows وعندك أدوات محلية لفتح البرامج والتحكم في الوسائط والتنقل. استخدمي الأداة المناسبة فورًا لما المستخدم يطلب تحكمًا في الكمبيوتر، ولا تقولي إن التنفيذ نجح إلا بعد نتيجة الأداة. '
            : '')+
          'خلي الحوار صوتي طبيعي، من غير شرح تقني، ومن غير ما تقولي أسماء مزودي الخدمة أو الأدوات.';

        socket.send(JSON.stringify({
          setup:{
            model:'models/'+model,
            generationConfig:{
              responseModalities:['AUDIO'],
              speechConfig:{
                voiceConfig:{
                  prebuiltVoiceConfig:{voiceName:'Aoede'}
                }
              }
            },
            systemInstruction:{parts:[{text:systemText}]},
            ...(desktopToolDeclarations?{tools:desktopToolDeclarations}:{}),
            inputAudioTranscription:{},
            outputAudioTranscription:{}
          }
        }));
      };

      socket.onmessage=async (event)=>{
        let payload:any;
        try{payload=JSON.parse(String(event.data||'{}'));}catch{return;}

        if(payload?.toolCall?.functionCalls?.length){
          const functionResponses=[];
          for(const call of payload.toolCall.functionCalls){
            const result=await executeLiveDesktopTool(String(call?.name||''),call?.args||{});
            functionResponses.push({
              id:call?.id,
              name:call?.name,
              response:{
                ok:Boolean(result?.ok),
                result:String(result?.message||'')
              }
            });
          }
          if(socket.readyState===WebSocket.OPEN){
            socket.send(JSON.stringify({
              toolResponse:{functionResponses}
            }));
          }
        }

        if(payload?.setupComplete){
          void startLiveCapture(socket).catch(error=>{
            console.error('DAI live mic failed',error);
            setErrorText('ضي مش قادرة تفتح الميكروفون. راجع إذن الميكروفون.');
            void endLiveVoice();
          });
          return;
        }

        const server=payload?.serverContent;
        if(!server)return;

        if(server.interrupted){
          stopLivePlayback();
          setVoiceSessionStatus('listening');
          animate('listen',0);
        }

        const inputText=String(server?.inputTranscription?.text||'');
        if(inputText){
          if(liveOutputSourcesRef.current.size){
            stopLivePlayback();
            setVoiceSessionStatus('listening');
            animate('listen',0);
          }
          liveInputTranscriptRef.current+=inputText;
        }

        const outputText=String(server?.outputTranscription?.text||'');
        if(outputText)liveOutputTranscriptRef.current+=outputText;

        const parts=server?.modelTurn?.parts||[];
        for(const part of parts){
          const inline=part?.inlineData;
          if(inline?.data)playLiveAudio(String(inline.data));
        }

        if(server.turnComplete){
          finishLiveTurn();
          setVoiceSessionStatus('listening');
          animate('listen',0);
        }
      };

      socket.onerror=()=>{
        if(!voiceSessionActiveRef.current)return;
        setErrorText('ضي حصل عندها خطأ في المحادثة الصوتية. جرّب تاني.');
      };

      socket.onclose=(event)=>{
        if(!voiceSessionActiveRef.current)return;
        if(event.code!==1000)setErrorText('المحادثة الصوتية اتقفلت بشكل غير متوقع.');
        void endLiveVoice();
      };
    }catch(error){
      console.error('DAI live voice failed',error);
      setErrorText('ضي مش قادرة تبدأ المحادثة الصوتية دلوقتي. جرّب تاني.');
      await endLiveVoice();
    }
  }

  function toggleMic(){
    if(voiceSessionActiveRef.current)void endLiveVoice();
    else void startLiveVoice();
  }

  async function newConversation(){
    await createConversation();
    setHistoryOpen(false);
    animate('wave',1800);
  }

  async function deleteConversation(id:string){
    if(!supabase)return;
    const { error }=await supabase.from('dai_conversations').delete().eq('id',id);
    if(error){setErrorText('تعذر حذف المحادثة.');return;}
    setConversations(prev=>prev.filter(c=>c.id!==id));
    if(activeId===id)setActiveId('');
  }


  return <main className='classic-shell' dir='rtl'>
    <div className='classic-bg-grid'/>
    <header className='classic-header'>
      <div className='classic-brand'><DaiLogo/><div><strong>DAI AI</strong><span>ضي · رفيقة أفكارك</span></div></div>
      <div className='classic-header-actions'>
        <span className='classic-status'><i className={sending?'busy':''}/><span>{loadingData?'بجهّز حسابك…':sending?(streamingText?'ضي بتكتب…':'ضي بتفكر…'):'حسابك متصل'}</span></span>
        <button onClick={()=>setHistoryOpen(true)} className='classic-icon-button' aria-label='المحادثات'><History className='h-5 w-5'/></button>
        <button onClick={()=>setSettingsOpen(true)} className='classic-icon-button' aria-label='الإعدادات'><Settings className='h-5 w-5'/></button>
      </div>
    </header>

    <section className='classic-stage'>
      <div className='classic-face-wrap classic-logo-stage'><DaiFace state={daiState} reduced={reduced}/></div>

      <div className='classic-motion-controls'>
        <button onClick={()=>animate('fishing',7400)}>صيد</button>
        <button onClick={()=>animate('heart',3800)}>قلب</button>
        <button onClick={()=>animate('dance',4800)}>رقصة</button>
        <button aria-pressed={reduced} onClick={()=>setReduced(!reduced)}>حركة هادية</button>
        <button onClick={()=>animate('wave',3800)}>تحية</button>
        <button onClick={()=>animate('happy',3800)}>فرحة</button>
        <button onClick={()=>animate('idea',3800)}>فكرة</button>
        <button onClick={()=>animate('search',3800)}>بحث</button>
        <button onClick={()=>animate('sleep',5400)}>نعاس</button>
        <button onClick={()=>animate('stretch',3800)}>تمدد</button>
      </div>

      <section className={'classic-chat-panel '+(voiceSessionActive?'voice-live':'')} ref={chatScrollRef} aria-label='المحادثة'>
        {voiceSessionActive&&
          <div className='classic-live-voice'>
            <div className={'classic-live-orb '+voiceSessionStatus}><i/><i/><i/><i/></div>
            <strong>{voiceSessionStatus==='connecting'?'ضي بتوصل الصوت…':voiceSessionStatus==='speaking'?'ضي بتتكلم':'ضي سامعاك'}</strong>
            <span>اضغط زر الإيقاف لما تخلص الحوار، وساعتها النص كله هيظهر هنا.</span>
          </div>
        }
        {!voiceSessionActive&&((active?.messages||[]).length===0
          ? <div className='classic-chat-empty'>أنا ضي… قولي اللي في بالك.</div>
          : (active?.messages||[]).map(m=>
            <article className={'classic-chat-message '+m.role} key={m.id}>
              <strong>{m.role==='user'?'أنت':'ضي'}</strong>
              <p dir='auto'>{m.content}</p>
              {m.role==='assistant'&&m.id===(active?.messages||[]).at(-1)?.id&&!sending&&
                <button className='classic-regenerate' onClick={regenerateLastReply} title='إعادة الرد'>
                  <RotateCcw className='h-3.5 w-3.5'/> إعادة الرد
                </button>
              }
            </article>
          ))}
        {!voiceSessionActive&&pendingUserMessage&&
          <article className='classic-chat-message user pending' key={pendingUserMessage.id}>
            <strong>أنت</strong>
            <p dir='auto'>{pendingUserMessage.content}</p>
          </article>
        }
        {!voiceSessionActive&&sending&&!streamingText&&<div className='classic-chat-typing'><i/><i/><i/><span>ضي بترد…</span></div>}
      </section>

      {errorText&&<div className='classic-error stage-error'>{errorText}</div>}

      {!!files.length&&<div className='github-files'>{files.map(f=><span key={f}>{f}</span>)}</div>}

      <div className='classic-input-bar'>
        <button className='classic-plus-button' onClick={()=>document.getElementById('github-file')?.click()} aria-label='إضافة ملف' title='إضافة ملف'>
          <Plus className='h-5 w-5'/>
        </button>
        <input id='github-file' type='file' hidden onChange={e=>{const f=e.target.files?.[0];if(f)setFiles(p=>[...p,f.name]);}}/>
        <textarea disabled={voiceSessionActive} value={input} onChange={e=>handleInputChange(e.target.value)} placeholder={voiceSessionActive?'محادثة صوتية شغالة…':'اسأل ضي'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}/>
        <div className='classic-input-actions'>
          <button className='classic-mic-button' aria-pressed={voiceSessionActive} onClick={toggleMic} aria-label={voiceSessionActive?'إنهاء المحادثة الصوتية':'بدء محادثة صوتية'} title={voiceSessionActive?'إنهاء الحوار الصوتي وإظهار النص':'ابدأ محادثة صوتية مباشرة مع ضي'}>
            {voiceSessionActive?<X className='h-5 w-5'/>:<Mic className='h-5 w-5'/>}
          </button>
          {sending&&!voiceSessionActive
            ? <button className='classic-send' onClick={stopTextReply} aria-label='إيقاف الرد' title='إيقاف الرد'>
                <Square className='h-4 w-4'/>
              </button>
            : <button className='classic-send' disabled={loadingData||voiceSessionActive||!input.trim()} onClick={sendMessage} aria-label='إرسال'>
                <Send className='h-5 w-5'/>
              </button>
          }
        </div>
      </div>
    </section>

    {historyOpen&&<div className='classic-overlay' onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryOpen(false)}}>
      <aside className='classic-drawer'>
        <div className='classic-drawer-head'><div><span>حسابك</span><h3>المحادثات</h3></div><button className='classic-icon-button' onClick={()=>setHistoryOpen(false)}><X className='h-5 w-5'/></button></div>
        <button className='classic-new-chat' onClick={newConversation}>محادثة جديدة</button>
        <div className='classic-history-list'>
          {conversations.length===0?<p>لسه مفيش محادثات.</p>:conversations.map(c=><div className={'classic-history-row '+(c.id===active?.id?'active':'')} key={c.id}><button onClick={()=>{setActiveId(c.id);setHistoryOpen(false)}}>{c.title}</button><button onClick={()=>deleteConversation(c.id)}><Trash2 className='h-4 w-4'/></button></div>)}
        </div>
      </aside>
    </div>}

    {settingsOpen&&<div className='classic-overlay' onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}>
      <section className='classic-settings'>
        <div className='classic-drawer-head'><div><span>حسابك</span><h3>الإعدادات</h3></div><button className='classic-icon-button' onClick={()=>setSettingsOpen(false)}><X className='h-5 w-5'/></button></div>
        <label className='classic-setting'><input type='checkbox' checked={reduced} onChange={e=>setReduced(e.target.checked)}/><span><strong>حركة هادية</strong><small>تقلل سرعة وحِدة الأنيميشن.</small></span></label>
        <label className='classic-setting'><input type='checkbox' checked={voiceEnabled} onChange={e=>setVoiceEnabled(e.target.checked)}/><span><strong>صوت الردود الصوتية</strong><small>ضي تتكلم بصوتها فقط لما أنت تكلمها بالصوت. الرسائل المكتوبة تفضل كتابة فقط.</small></span></label>
        {desktopMode&&<label className='classic-setting'><input type='checkbox' checked={desktopStartup} onChange={async e=>{const next=e.target.checked;setDesktopStartup(next);try{const actual=await window.daiDesktop?.setStartup(next);setDesktopStartup(Boolean(actual));}catch{setDesktopStartup(!next);}}}/><span><strong>تشغيل ضي مع Windows</strong><small>يشغّل برنامج ضي تلقائيًا بعد تسجيل الدخول إلى Windows.</small></span></label>}
        {desktopMode&&<div className='classic-privacy'>نسخة الكمبيوتر مفعّل فيها فتح البرامج والتحكم في تشغيل الوسائط والصوت واختصارات التنقل المسموح بها.</div>}
        <div className='classic-privacy'>كل مستخدم يقدر يشوف ويعدل محادثاته هو فقط بفضل Row Level Security.</div>
      </section>
    </div>}
  </main>;
}
