import { useEffect, useMemo, useRef, useState } from 'react';
import DaiFace, { type DaiState } from './DaiFace';
import { History, Mic, Paperclip, Send, Settings, Trash2, X } from 'lucide-react';

type LocalMessage = { id:string; role:'user'|'assistant'; content:string; createdAt:number };
type LocalConversation = { id:string; title:string; messages:LocalMessage[]; updatedAt:number };

const STORAGE_KEY='dai-github-conversations-v1';

function DaiLogo({className=''}:{className?:string}) {
  return <img src='./dai-logo.svg' className={className} alt='لوجو ضي' width={192} height={192}/>;
}

export default function GithubApp(){
  const [daiState,setDaiState]=useState<DaiState>('wave');
  const [reduced,setReduced]=useState(false);
  const [input,setInput]=useState('');
  const [historyOpen,setHistoryOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [activeId,setActiveId]=useState<string>('');
  const [conversations,setConversations]=useState<LocalConversation[]>(()=>{
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  });
  const [listening,setListening]=useState(false);
  const [files,setFiles]=useState<string[]>([]);
  const timer=useRef<number|undefined>(undefined);

  function animate(state:DaiState,duration=2200){
    clearTimeout(timer.current);
    setDaiState(state);
    if(duration) timer.current=window.setTimeout(()=>setDaiState('idle'),duration);
  }

  useEffect(()=>{ animate('wave',2600); return()=>clearTimeout(timer.current); },[]);
  useEffect(()=>{ localStorage.setItem(STORAGE_KEY,JSON.stringify(conversations)); },[conversations]);

  const active=conversations.find(c=>c.id===activeId) || conversations[0] || null;
  useEffect(()=>{ if(!activeId && conversations[0]) setActiveId(conversations[0].id); },[activeId,conversations]);
  const latestAssistant=useMemo(()=>[...(active?.messages||[])].reverse().find(m=>m.role==='assistant'),[active]);

  function ensureConversation(text:string){
    if(active) return active.id;
    const id='local-'+Date.now();
    const c:LocalConversation={id,title:text.slice(0,32)||'محادثة جديدة',messages:[],updatedAt:Date.now()};
    setConversations(prev=>[c,...prev]);
    setActiveId(id);
    return id;
  }

  function sendMessage(){
    const text=input.trim();
    if(!text) return;
    const id=ensureConversation(text);
    setInput('');
    animate(/بحث|دور|search|أحدث|احدث|آخر/i.test(text)?'search':'idea',1200);
    const user:LocalMessage={id:'u-'+Date.now(),role:'user',content:text,createdAt:Date.now()};
    const reply:LocalMessage={
      id:'a-'+(Date.now()+1),
      role:'assistant',
      content:'أنا شغالة دلوقتي من GitHub Pages بكل الواجهة والأنيميشن. الـAI نفسه مستني تشغيل الـbackend، ولما يتوصل هرجع أرد عليك فعليًا من نفس الصفحة.',
      createdAt:Date.now()+1
    };
    setConversations(prev=>{
      const found=prev.find(c=>c.id===id);
      if(found) return prev.map(c=>c.id===id?{...c,title:c.title||text.slice(0,32),messages:[...c.messages,user,reply],updatedAt:Date.now()}:c);
      return [{id,title:text.slice(0,32),messages:[user,reply],updatedAt:Date.now()},...prev];
    });
    window.setTimeout(()=>animate('talk',3400),700);
  }

  function newConversation(){
    const id='local-'+Date.now();
    setConversations(prev=>[{id,title:'محادثة جديدة',messages:[],updatedAt:Date.now()},...prev]);
    setActiveId(id); setHistoryOpen(false); animate('wave',1800);
  }

  function deleteConversation(id:string){
    setConversations(prev=>prev.filter(c=>c.id!==id));
    if(activeId===id) setActiveId('');
  }

  function toggleMic(){
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){ animate('shake' as DaiState,900); return; }
    if(listening) return;
    const rec=new SR();
    rec.lang='ar-SA'; rec.interimResults=false; rec.maxAlternatives=1;
    setListening(true); animate('listen',0);
    rec.onresult=(e:any)=>setInput(v=>(v?v+' ':'')+e.results[0][0].transcript);
    rec.onerror=()=>{};
    rec.onend=()=>{setListening(false);animate('idle',0);};
    rec.start();
  }

  return <main className='classic-shell' dir='rtl'>
    <div className='classic-bg-grid'/>
    <header className='classic-header'>
      <div className='classic-brand'>
        <DaiLogo/>
        <div><strong>DAI AI</strong><span>ضي · رفيقة أفكارك</span></div>
      </div>
      <div className='classic-header-actions'>
        <span className='classic-status'><i/><span>GitHub Mode</span></span>
        <button onClick={()=>setHistoryOpen(true)} className='classic-icon-button' aria-label='المحادثات'><History className='h-5 w-5'/></button>
        <button onClick={()=>setSettingsOpen(true)} className='classic-icon-button' aria-label='الإعدادات'><Settings className='h-5 w-5'/></button>
      </div>
    </header>

    <section className='classic-stage'>
      <div className='classic-face-wrap classic-logo-stage'>
        <DaiFace state={daiState} reduced={reduced}/>
      </div>

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
        <span className='classic-response-label'>ضي · GitHub Mode</span>
        <p>{latestAssistant?.content || 'أنا ضي… الواجهة والأنيميشن شغالين من GitHub Pages. الـAI هيتوصل أول ما نشغّل الـbackend.'}</p>
      </section>

      <details className='conversation-transcript'>
        <summary>نص المحادثة ({active?.messages.length||0})</summary>
        {(active?.messages||[]).map(m=><article key={m.id}><strong>{m.role==='user'?'أنت':'ضي'}</strong><p dir='auto'>{m.content}</p></article>)}
      </details>

      {!!files.length && <div className='github-files'>{files.map(f=><span key={f}>{f}</span>)}</div>}

      <div className='classic-input-bar'>
        <button className='classic-input-icon' onClick={()=>document.getElementById('github-file')?.click()} aria-label='إرفاق'><Paperclip className='h-5 w-5'/></button>
        <input id='github-file' type='file' hidden onChange={e=>{const f=e.target.files?.[0];if(f)setFiles(p=>[...p,f.name]);}}/>
        <button className='classic-input-icon' aria-pressed={listening} onClick={toggleMic} aria-label='الميكروفون'><Mic className='h-5 w-5'/></button>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder='اكتب لضي…' onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}/>
        <button className='classic-send' onClick={sendMessage} aria-label='إرسال'><Send className='h-5 w-5'/></button>
      </div>
      <p className='classic-hint'>الوضع المؤقت: الواجهة + الأنيميشن + التخزين المحلي شغالين من GitHub Pages، والـAI ينتظر الـbackend.</p>
    </section>

    {historyOpen && <div className='classic-overlay' onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryOpen(false)}}>
      <aside className='classic-drawer'>
        <div className='classic-drawer-head'><div><span>محلي على الجهاز</span><h3>المحادثات</h3></div><button className='classic-icon-button' onClick={()=>setHistoryOpen(false)}><X className='h-5 w-5'/></button></div>
        <button className='classic-new-chat' onClick={newConversation}>محادثة جديدة</button>
        <div className='classic-history-list'>
          {conversations.length===0?<p>لسه مفيش محادثات.</p>:conversations.map(c=><div className={'classic-history-row '+(c.id===active?.id?'active':'')} key={c.id}><button onClick={()=>{setActiveId(c.id);setHistoryOpen(false)}}>{c.title}</button><button onClick={()=>deleteConversation(c.id)}><Trash2 className='h-4 w-4'/></button></div>)}
        </div>
      </aside>
    </div>}

    {settingsOpen && <div className='classic-overlay' onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}>
      <section className='classic-settings'>
        <div className='classic-drawer-head'><div><span>GitHub Mode</span><h3>الإعدادات</h3></div><button className='classic-icon-button' onClick={()=>setSettingsOpen(false)}><X className='h-5 w-5'/></button></div>
        <label className='classic-setting'><input type='checkbox' checked={reduced} onChange={e=>setReduced(e.target.checked)}/><span><strong>حركة هادية</strong><small>تقلل سرعة وحِدة الأنيميشن.</small></span></label>
        <div className='classic-privacy'>المحادثات في الوضع المؤقت بتتحفظ محليًا داخل المتصفح فقط.</div>
      </section>
    </div>}
  </main>;
}
