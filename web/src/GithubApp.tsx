import { useEffect, useRef, useState } from 'react';
import DaiFace, { type DaiState } from './DaiFace';
import { History, Mic, Paperclip, Send, Settings, Trash2, X } from 'lucide-react';
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

      if(code==='GEMINI_CONFIG') return 'مفتاح Gemini API مش موجود في Supabase Secrets.';
      if(code==='GEMINI_AUTH') return 'Gemini رفض مفتاح الـAPI أو المشروع. راجع المفتاح من Google AI Studio.';
      if(code==='GEMINI_MODEL') return 'موديلات Gemini المجانية المحددة مش متاحة للمشروع حاليًا.';
      if(code==='GEMINI_QUOTA') return 'وصلنا لحد Gemini المجاني الحالي. ضي هتحاول موديل مجاني بديل تلقائيًا، ولو كلهم خلصوا جرّب لاحقًا.';
      if(code==='GEMINI_RATE_LIMIT') return 'Gemini وصل لحد الطلبات مؤقتًا. جرّب بعد شوية.';
      if(code==='GEMINI_OVERLOADED') return 'Gemini عليه ضغط مؤقتًا. جرّب بعد شوية.';
      if(code==='GEMINI_TIMEOUT') return 'Gemini اتأخر في الرد. جرّب تاني.';
      if(code==='GEMINI_NETWORK') return 'Supabase مش قادر يوصل لـGemini حاليًا.';
      if(code==='GEMINI_BAD_REQUEST') return 'Gemini رفض صيغة الطلب. الكود محتاج مراجعة.';
      if(status===404) return 'دالة chat مش موجودة على Supabase أو لسه ما اتعملهاش Deploy.';
      if(status===401) return 'جلسة تسجيل الدخول انتهت. سجّل دخول من جديد.';
      if(status>=500) return 'الـbackend شغال لكن حصل خطأ أثناء الاتصال بـGemini.';
    } catch {}
  }

  const message=String(error?.message||'');
  if(/Failed to send|fetch|network/i.test(message)) {
    return 'تعذر الوصول لـSupabase Edge Function. تأكد إن دالة chat معمولة Deploy.';
  }
  return 'حصل خطأ في اتصال ضي بالـAI. افتح Console أو Supabase Functions Logs لمعرفة السبب.';
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
  const [files,setFiles]=useState<string[]>([]);
  const [loadingData,setLoadingData]=useState(true);
  const [sending,setSending]=useState(false);
  const [errorText,setErrorText]=useState('');
  const [userId,setUserId]=useState('');
  const timer=useRef<number|undefined>(undefined);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const chatScrollRef=useRef<HTMLElement|null>(null);

  function animate(state:DaiState,duration=2200){
    clearTimeout(timer.current);
    setDaiState(state);
    if(duration) timer.current=window.setTimeout(()=>setDaiState('idle'),duration);
  }

  function stateForUserText(text:string):DaiState{
    if(/شكرا|شكرًا|تسلم|حلو|جميل|ممتاز|فرح|مبسوط/i.test(text))return 'happy';
    if(/بحب|حب|قلب|وحشت/i.test(text))return 'heart';
    if(/نعسان|نوم|نامي|تصبحي|تصبح/i.test(text))return 'sleep';
    if(/فكرة|اقتراح|صمم|اعمل|نخطط|خطة|ابداع/i.test(text))return 'idea';
    if(/بحث|دور|ابحث|مين|امتى|متى|فين|أين|اين|كام|كم|آخر|احدث|أحدث|search|latest/i.test(text))return 'search';
    return 'listen';
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

  function speakBrowserFallback(text:string){
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
    utterance.onstart=()=>{ clearTimeout(timer.current); setDaiState('talk'); };
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

  async function speakReply(text:string){
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
      return speakBrowserFallback(spoken);
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
      if(!alive)return;
      setUserId(uid);
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
      if(!supabase||!activeId)return;
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
  },[activeId]);

  const active=conversations.find(c=>c.id===activeId)||null;

  useEffect(()=>{
    const node=chatScrollRef.current;
    if(!node)return;
    requestAnimationFrame(()=>node.scrollTo({top:node.scrollHeight,behavior:'smooth'}));
  },[activeId,active?.messages.length]);

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
    const text=(typeof messageOverride==='string'?messageOverride:input).trim();
    if(!text||!supabase||loadingData||sending)return;
    setInput('');
    setErrorText('');
    setSending(true);
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

      setActiveId(conversationId);
      setConversations(prev=>{
        const existing=prev.find(c=>c.id===conversationId);
        const updated:Conversation=existing
          ? {...existing,messages:[...existing.messages,userMessage,assistantMessage],updatedAt:Date.now()}
          : {id:conversationId,title:text.slice(0,48)||'محادثة جديدة',messages:[userMessage,assistantMessage],updatedAt:Date.now()};
        return [updated,...prev.filter(c=>c.id!==conversationId)];
      });

      const answerState=stateForAssistantText(assistantMessage.content);
      animate(answerState,answerState==='talk'?0:1600);

      const speaking=await speakReply(assistantMessage.content);
      if(!speaking) animate(answerState,Math.min(5000,Math.max(1500,assistantMessage.content.length*18)));
    } catch (error) {
      console.error('DAI chat failed', error);
      setInput(text);
      setErrorText(await explainChatError(error));
      animate('idle',0);
    } finally {
      setSending(false);
    }
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

  function toggleMic(){
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){
      setErrorText('المتصفح ده مش بيدعم الاستماع الصوتي. جرّب Chrome أو Edge.');
      return;
    }
    if(listening)return;

    if('speechSynthesis' in window) window.speechSynthesis.cancel();
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.src='';
      audioRef.current=null;
    }

    const rec=new SR();
    rec.lang='ar-EG';
    rec.interimResults=true;
    rec.maxAlternatives=1;
    rec.continuous=false;

    let sentVoice=false;
    setListening(true);
    setErrorText('');
    setInput('');
    animate('listen',0);

    rec.onresult=(e:any)=>{
      let finalText='';
      let interimText='';

      for(let i=e.resultIndex;i<e.results.length;i++){
        const chunk=String(e.results[i][0]?.transcript||'').trim();
        if(!chunk)continue;
        if(e.results[i].isFinal) finalText+=(finalText?' ':'')+chunk;
        else interimText+=(interimText?' ':'')+chunk;
      }

      const visible=(finalText||interimText).trim();
      if(visible)setInput(visible);

      if(finalText&&!sentVoice){
        sentVoice=true;
        setListening(false);
        void sendMessage(finalText);
        try{ rec.stop(); }catch{}
      }
    };

    rec.onerror=(e:any)=>{
      setListening(false);
      if(e?.error==='not-allowed'||e?.error==='service-not-allowed'){
        setErrorText('اسمح للموقع باستخدام الميكروفون من إعدادات المتصفح.');
      }else if(e?.error!=='no-speech'&&e?.error!=='aborted'){
        setErrorText('حصلت مشكلة أثناء الاستماع. جرّب تاني.');
      }
      if(!sentVoice)animate('idle',0);
    };

    rec.onend=()=>{
      setListening(false);
      if(!sentVoice)animate('idle',0);
    };

    rec.start();
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

      <section className='classic-chat-panel' ref={chatScrollRef} aria-label='المحادثة'>
        {(active?.messages||[]).length===0
          ? <div className='classic-chat-empty'>أنا ضي… قولي اللي في بالك.</div>
          : (active?.messages||[]).map(m=>
            <article className={'classic-chat-message '+m.role} key={m.id}>
              <strong>{m.role==='user'?'أنت':'ضي'}</strong>
              <p dir='auto'>{m.content}</p>
            </article>
          )}
        {sending&&<div className='classic-chat-typing'><i/><i/><i/><span>ضي بتجهز ردها</span></div>}
      </section>

      {errorText&&<div className='classic-error stage-error'>{errorText}</div>}

      {!!files.length&&<div className='github-files'>{files.map(f=><span key={f}>{f}</span>)}</div>}

      <div className='classic-input-bar'>
        <button className='classic-input-icon' onClick={()=>document.getElementById('github-file')?.click()} aria-label='إرفاق'><Paperclip className='h-5 w-5'/></button>
        <input id='github-file' type='file' hidden onChange={e=>{const f=e.target.files?.[0];if(f)setFiles(p=>[...p,f.name]);}}/>
        <button className='classic-input-icon' aria-pressed={listening} onClick={toggleMic} aria-label='الميكروفون'><Mic className='h-5 w-5'/></button>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={listening?'بسمعك… اتكلم براحتك':'اكتب لضي…'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}/>
        <button className='classic-send' disabled={loadingData||sending} onClick={sendMessage} aria-label='إرسال'><Send className='h-5 w-5'/></button>
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
        <label className='classic-setting'><input type='checkbox' checked={voiceEnabled} onChange={e=>setVoiceEnabled(e.target.checked)}/><span><strong>صوت ضي</strong><small>تشغيل الردود تلقائيًا بصوت ضي من Gemini، مع صوت المتصفح كاحتياطي لو الخدمة تعذرت.</small></span></label>
        <div className='classic-privacy'>كل مستخدم يقدر يشوف ويعدل محادثاته هو فقط بفضل Row Level Security.</div>
      </section>
    </div>}
  </main>;
}
