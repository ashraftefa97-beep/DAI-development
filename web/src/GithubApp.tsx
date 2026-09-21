import { useEffect, useRef, useState } from 'react';
import DaiFace, { type DaiState } from './DaiFace';
import { History, Mic, Plus, Send, Settings, Trash2, X } from 'lucide-react';
import { supabase } from './supabaseClient';

type Message = { id:string; role:'user'|'assistant'; content:string; createdAt:number };
type Conversation = { id:string; title:string; messages:Message[]; updatedAt:number };

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
  const [pendingUserMessage,setPendingUserMessage]=useState<Message|null>(null);
  const [errorText,setErrorText]=useState('');
  const [userId,setUserId]=useState('');
  const [userName,setUserName]=useState('');
  const timer=useRef<number|undefined>(undefined);
  const typingTimer=useRef<number|undefined>(undefined);
  const audioRef=useRef<HTMLAudioElement|null>(null);
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

  async function speakReply(text:string,onStart?:()=>void){
    if(!voiceEnabled||!supabase)return false;
    const spoken=cleanForSpeech(text).slice(0,2800);
    if(!spoken)return false;

    const responseState=stateForAssistantText(text);
    animate(responseState,responseState==='talk'?0:1800);

    try{
      if('speechSynthesis' in window)window.speechSynthesis.cancel();
      if(audioRef.current){
        audioRef.current.pause();
        audioRef.current.src='';
        audioRef.current=null;
      }

      const {data,error}=await supabase.functions.invoke('tts',{
        body:{text:spoken}
      });

      if(error)throw error;
      if(!data?.audioBase64)throw new Error('Gemini TTS returned no audio');

      const url=base64ToAudioUrl(String(data.audioBase64),String(data.mimeType||'audio/wav'));
      const audio=new Audio(url);
      audioRef.current=audio;

      audio.onplay=()=>{
        clearTimeout(timer.current);
        setDaiState('talk');
        onStart?.();
      };
      audio.onended=()=>{
        URL.revokeObjectURL(url);
        if(audioRef.current===audio)audioRef.current=null;
        const finishState=responseState==='talk'?'idle':responseState;
        if(finishState==='idle')setDaiState('idle');
        else animate(finishState,1100);
      };
      audio.onerror=()=>{
        URL.revokeObjectURL(url);
        if(audioRef.current===audio)audioRef.current=null;
        setDaiState('idle');
      };

      await audio.play();
      return true;
    }catch(error){
      console.error('Gemini TTS failed, using browser fallback',error);
      return speakBrowserFallback(spoken,onStart);
    }
  }

  useEffect(()=>{
    try { localStorage.setItem('dai-voice-enabled',voiceEnabled?'1':'0'); } catch {}
    if(!voiceEnabled){
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
    try{ recognitionRef.current?.stop(); }catch{}
    recognitionRef.current=null;
    try{ liveSocketRef.current?.close(); }catch{}
    liveSocketRef.current=null;
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

  async function sendMessage(messageOverride?:unknown){
    const fromVoice=typeof messageOverride==='string';
    const text=(fromVoice?messageOverride:input).trim();
    if(!text||!supabase||loadingData||sending)return;
    if(!fromVoice)setInput('');
    clearTimeout(typingTimer.current);
    setErrorText('');
    setSending(true);
    const optimisticMessage:Message={
      id:'pending-'+Date.now(),
      role:'user',
      content:text,
      createdAt:Date.now()
    };
    setPendingUserMessage(optimisticMessage);
    animate(stateForUserText(text),0);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          conversationId: activeId || null,
          message: text,
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

      // Put the user's message in the chat immediately, but reveal DAI's text
      // only when her voice actually starts.
      setConversations(prev=>{
        const existing=prev.find(c=>c.id===conversationId);
        const baseMessages=existing?.messages||[];
        const withoutDuplicate=baseMessages.filter(m=>m.id!==userMessage.id&&m.id!==assistantMessage.id);
        const updated:Conversation=existing
          ? {...existing,messages:[...withoutDuplicate,userMessage],updatedAt:Date.now()}
          : {id:conversationId,title:text.slice(0,48)||'محادثة جديدة',messages:[userMessage],updatedAt:Date.now()};
        return [updated,...prev.filter(c=>c.id!==conversationId)];
      });

      let revealed=false;
      const revealAssistant=()=>{
        if(revealed)return;
        revealed=true;
        setConversations(prev=>prev.map(c=>
          c.id===conversationId && !c.messages.some(m=>m.id===assistantMessage.id)
            ? {...c,messages:[...c.messages,assistantMessage],updatedAt:Date.now()}
            : c
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
      if(!fromVoice)setInput(text);
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
      const socket=new WebSocket(
        'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token='+encodeURIComponent(token)
      );
      liveSocketRef.current=socket;

      socket.onopen=()=>{
        const systemText=
          'أنت ضي، مساعدة صوتية أنثوية ودودة وسريعة. اسم المستخدم الحالي هو «'+currentName+'». '+
          'اتكلمي بالعربية المصرية بشكل طبيعي ومختصر. لا تذكري أسماء مستخدمين آخرين. '+
          'لا تستخدمي لقب «أشروفي» إلا إذا نطق المستخدم كلمة «أشروفي» أو سأل عنها صراحة في نفس الحوار. '+
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
            inputAudioTranscription:{},
            outputAudioTranscription:{}
          }
        }));
      };

      socket.onmessage=(event)=>{
        let payload:any;
        try{payload=JSON.parse(String(event.data||'{}'));}catch{return;}

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
        if(inputText)liveInputTranscriptRef.current+=inputText;

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
        <span className='classic-status'><i className={sending?'busy':''}/><span>{loadingData?'بجهّز حسابك…':sending?'ضي بتفكر…':'حسابك متصل'}</span></span>
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
            </article>
          ))}
        {!voiceSessionActive&&pendingUserMessage&&
          <article className='classic-chat-message user pending' key={pendingUserMessage.id}>
            <strong>أنت</strong>
            <p dir='auto'>{pendingUserMessage.content}</p>
          </article>
        }
        {!voiceSessionActive&&sending&&<div className='classic-chat-typing'><i/><i/><i/><span>ضي بترد…</span></div>}
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
          <button className='classic-send' disabled={loadingData||sending||voiceSessionActive||!input.trim()} onClick={sendMessage} aria-label='إرسال'>
            <Send className='h-5 w-5'/>
          </button>
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
        <label className='classic-setting'><input type='checkbox' checked={voiceEnabled} onChange={e=>setVoiceEnabled(e.target.checked)}/><span><strong>صوت ضي</strong><small>تشغيل ردود ضي بصوتها تلقائيًا، مع صوت الجهاز كاحتياطي لو الخدمة تعذرت.</small></span></label>
        <div className='classic-privacy'>كل مستخدم يقدر يشوف ويعدل محادثاته هو فقط بفضل Row Level Security.</div>
      </section>
    </div>}
  </main>;
}
