import { useEffect, useMemo, useRef, useState } from 'react';
import DaiFace, { type DaiState } from './DaiFace';
import { History, Mic, Paperclip, Send, Settings, Trash2, X } from 'lucide-react';
import { supabase } from './supabaseClient';

type Message = { id:string; role:'user'|'assistant'; content:string; createdAt:number };
type Conversation = { id:string; title:string; messages:Message[]; updatedAt:number };

function DaiLogo({className=''}:{className?:string}) {
  return <img src='./dai-logo.svg' className={className} alt='لوجو ضي' width={192} height={192}/>;
}

export default function GithubApp(){
  const [daiState,setDaiState]=useState<DaiState>('wave');
  const [reduced,setReduced]=useState(false);
  const [input,setInput]=useState('');
  const [historyOpen,setHistoryOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [activeId,setActiveId]=useState('');
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [listening,setListening]=useState(false);
  const [files,setFiles]=useState<string[]>([]);
  const [loadingData,setLoadingData]=useState(true);
  const [errorText,setErrorText]=useState('');
  const [userId,setUserId]=useState('');
  const timer=useRef<number|undefined>(undefined);

  function animate(state:DaiState,duration=2200){
    clearTimeout(timer.current);
    setDaiState(state);
    if(duration) timer.current=window.setTimeout(()=>setDaiState('idle'),duration);
  }

  useEffect(()=>{ animate('wave',2600); return()=>clearTimeout(timer.current); },[]);

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
  const latestAssistant=useMemo(()=>[...(active?.messages||[])].reverse().find(m=>m.role==='assistant'),[active]);

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

  async function sendMessage(){
    const text=input.trim();
    if(!text||!supabase||!userId)return;
    setInput('');
    setErrorText('');
    animate(/بحث|دور|search|أحدث|احدث|آخر/i.test(text)?'search':'idea',1200);

    let conversationId=activeId;
    if(!conversationId){
      conversationId=await createConversation(text.slice(0,32)||'محادثة جديدة')||'';
      if(!conversationId){setInput(text);return;}
    }

    const { data:userRow,error:userError }=await supabase
      .from('dai_messages')
      .insert({conversation_id:conversationId,user_id:userId,role:'user',content:text})
      .select('id,role,content,created_at')
      .single();
    if(userError){setErrorText('تعذر حفظ رسالتك.');setInput(text);return;}

    const userMessage:Message={id:userRow.id,role:'user',content:userRow.content,createdAt:new Date(userRow.created_at).getTime()};
    setConversations(prev=>prev.map(c=>c.id===conversationId?{...c,messages:[...c.messages,userMessage],updatedAt:Date.now()}:c));

    const replyText='أنا شغالة دلوقتي من GitHub Pages، ومحادثتك اتحفظت في حسابك على Supabase. الـAI الحقيقي هنوصله في الخطوة الجاية.';
    const { data:replyRow,error:replyError }=await supabase
      .from('dai_messages')
      .insert({conversation_id:conversationId,user_id:userId,role:'assistant',content:replyText})
      .select('id,role,content,created_at')
      .single();

    await supabase.from('dai_conversations').update({updated_at:new Date().toISOString(),title:active?.title==='محادثة جديدة'?text.slice(0,32):undefined}).eq('id',conversationId);

    if(replyError){setErrorText('اتحفظت رسالتك لكن تعذر حفظ الرد المؤقت.');return;}
    const reply:Message={id:replyRow.id,role:'assistant',content:replyRow.content,createdAt:new Date(replyRow.created_at).getTime()};
    setConversations(prev=>prev.map(c=>c.id===conversationId?{...c,messages:[...c.messages,reply],updatedAt:Date.now()}:c).sort((a,b)=>b.updatedAt-a.updatedAt));
    window.setTimeout(()=>animate('talk',3400),500);
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
    if(!SR)return;
    if(listening)return;
    const rec=new SR();
    rec.lang='ar-SA';rec.interimResults=false;rec.maxAlternatives=1;
    setListening(true);animate('listen',0);
    rec.onresult=(e:any)=>setInput(v=>(v?v+' ':'')+e.results[0][0].transcript);
    rec.onerror=()=>{};
    rec.onend=()=>{setListening(false);animate('idle',0);};
    rec.start();
  }

  return <main className='classic-shell' dir='rtl'>
    <div className='classic-bg-grid'/>
    <header className='classic-header'>
      <div className='classic-brand'><DaiLogo/><div><strong>DAI AI</strong><span>ضي · رفيقة أفكارك</span></div></div>
      <div className='classic-header-actions'>
        <span className='classic-status'><i/><span>{loadingData?'بجهّز حسابك…':'حسابك متصل'}</span></span>
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

      <section className='classic-response-card'>
        <span className='classic-response-label'>ضي · حسابك الخاص</span>
        <p>{latestAssistant?.content||'أنا ضي… محادثاتك هتتحفظ في حسابك وتظهر لك على أي جهاز بعد تسجيل الدخول.'}</p>
      </section>

      {errorText&&<div className='classic-error stage-error'>{errorText}</div>}

      <details className='conversation-transcript'>
        <summary>نص المحادثة ({active?.messages.length||0})</summary>
        {(active?.messages||[]).map(m=><article key={m.id}><strong>{m.role==='user'?'أنت':'ضي'}</strong><p dir='auto'>{m.content}</p></article>)}
      </details>

      {!!files.length&&<div className='github-files'>{files.map(f=><span key={f}>{f}</span>)}</div>}

      <div className='classic-input-bar'>
        <button className='classic-input-icon' onClick={()=>document.getElementById('github-file')?.click()} aria-label='إرفاق'><Paperclip className='h-5 w-5'/></button>
        <input id='github-file' type='file' hidden onChange={e=>{const f=e.target.files?.[0];if(f)setFiles(p=>[...p,f.name]);}}/>
        <button className='classic-input-icon' aria-pressed={listening} onClick={toggleMic} aria-label='الميكروفون'><Mic className='h-5 w-5'/></button>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder='اكتب لضي…' onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}/>
        <button className='classic-send' disabled={loadingData} onClick={sendMessage} aria-label='إرسال'><Send className='h-5 w-5'/></button>
      </div>
      <p className='classic-hint'>المحادثات محفوظة في حسابك على Supabase. الـAI الحقيقي لسه هنوصله بالـbackend.</p>
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
        <div className='classic-privacy'>كل مستخدم يقدر يشوف ويعدل محادثاته هو فقط بفضل Row Level Security.</div>
      </section>
    </div>}
  </main>;
}
