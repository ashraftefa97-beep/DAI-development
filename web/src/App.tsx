import { useEffect, useMemo, useRef, useState } from 'react';
import { product } from './product.mjs';
import DaiFace, { type DaiState } from './DaiFace';
import { useMicrophone } from './useMicrophone';
import { api, auth } from '@appdeploy/client';
import {
  History,
  LogIn,
  LogOut,
  Mic,
  Paperclip,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

type User = { userId: string; email?: string; name?: string; picture?: string };
type Source = { title: string; url: string; snippet?: string };
type Conversation = { id: string; title: string; createdAt: number; updatedAt: number };
type Message = { id: string; role: 'user' | 'assistant'; content: string; createdAt: number; sources?: Source[] };
type UserGender = 'male' | 'female' | null;
type Preferences = { autoResearch: boolean; saveSearchHistory: boolean; gender: UserGender };
const defaultPrefs: Preferences = { ...product.preferences, gender: null };

function DaiLogo({className=''}: {className?:string}) {
  return <img src='./dai-logo.svg' className={className} alt='لوجو ضي' width={192} height={192} />;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [errorText, setErrorText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [daiState, setDaiState] = useState<DaiState>('wave');
  const [reduced, setReduced] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [conversationCursor, setConversationCursor] = useState<string | null>(null);
  const [files, setFiles] = useState<{name:string;url:string}[]>([]);
  const session = useRef(0);
  const loadVersion = useRef(0);
  const sendLock = useRef(false);
  const motionTimer = useRef<number | undefined>(undefined);
  const currentId = useRef(activeId);
  currentId.current = activeId;
  const microphone = useMicrophone((text) => setInput(value => (value ? value + ' ' : '') + text), setErrorText);
  function animate(state: DaiState, duration = 2200) {
    clearTimeout(motionTimer.current);
    setDaiState(state);
    if(duration) motionTimer.current = window.setTimeout(() => setDaiState('idle'), duration);
  }
  useEffect(() => () => { session.current++; clearTimeout(motionTimer.current); }, []);
  useEffect(() => {
    if(microphone.listening) animate('listen', 0);
    else if(daiState === 'listen') animate('idle', 0);
  }, [microphone.listening]);

  useEffect(() => {
    let alive = true;
    auth.getUser().then((u) => { if(alive) setUser(u as User | null); })
      .catch(() => { if(alive) setErrorText('تعذر استعادة الجلسة. جرّب تسجيل الدخول.'); })
      .finally(() => { if(alive) setLoadingAuth(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    animate('wave');
    return () => clearTimeout(motionTimer.current);
  }, []);

  useEffect(() => {
    if (!user) { setDataReady(false); return; }
    const epoch = session.current;
    setDataReady(false);
    let alive = true;
    Promise.all([api.get('/api/conversations'), api.get('/api/settings')])
      .then(([conversationResponse, settingsResponse]) => {
        if(!alive || epoch !== session.current) return;
        setConversationCursor(conversationResponse.data.nextToken || null);
        const list = (conversationResponse.data.conversations || []) as Conversation[];
        setConversations(list);
        setPrefs((settingsResponse.data.preferences || defaultPrefs) as Preferences);
        if (list[0]) setActiveId(list[0].id);
      })
      .catch(() => { if(alive && epoch === session.current) setErrorText('تعذر تحميل بيانات حسابك.'); })
      .finally(() => { if(alive && epoch === session.current) setDataReady(true); });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    const version = ++loadVersion.current;
    setMessageCursor(null);
    if (!activeId || !user) { setMessages([]); setLoadingMessages(false); return; }
    setLoadingMessages(true);
    setMessages([]);
    api.get('/api/conversations/' + activeId + '/messages')
      .then(response => {
        if(version !== loadVersion.current) return;
        setMessages(response.data.messages || []);
        setMessageCursor(response.data.nextToken || null);
      })
      .catch(() => { if(version === loadVersion.current) setErrorText('تعذر تحميل المحادثة.'); })
      .finally(() => { if(version === loadVersion.current) setLoadingMessages(false); });
    return () => { loadVersion.current++; };
  }, [activeId, user]);

  async function loadMoreMessages() {
    if(!messageCursor || loadingMessages || !activeId) return;
    const version = loadVersion.current;
    setLoadingMessages(true);
    try {
      const response = await api.get('/api/conversations/' + activeId + '/messages?cursor=' + encodeURIComponent(messageCursor));
      if(version !== loadVersion.current) return;
      setMessages(old => [...new Map([...old, ...(response.data.messages as Message[])].map(m => [m.id, m])).values()].sort((a,b) => a.createdAt-b.createdAt));
      setMessageCursor(response.data.nextToken || null);
    } catch { if(version === loadVersion.current) setErrorText('تعذر تحميل باقي المحادثة.'); }
    finally { if(version === loadVersion.current) setLoadingMessages(false); }
  }

  async function loadMoreConversations() {
    if(!conversationCursor) return;
    const epoch = session.current;
    try {
      const response = await api.get('/api/conversations?cursor=' + encodeURIComponent(conversationCursor));
      if(epoch !== session.current) return;
      setConversations(old => [...new Map([...old, ...(response.data.conversations as Conversation[])].map(c => [c.id,c])).values()]);
      setConversationCursor(response.data.nextToken || null);
    } catch { if(epoch === session.current) setErrorText('تعذر تحميل باقي المحادثات.'); }
  }

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages]
  );

  async function signIn() {
    setErrorText('');
    try {
      const result = await auth.signIn();
      setUser(result.user as User);
      animate('happy', 1800);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'popup_blocked') setErrorText('اسمح بالنوافذ المنبثقة ثم حاول تاني.');
      else if (code !== 'popup_closed') setErrorText('تعذر تسجيل الدخول. حاول مرة تانية.');
    }
  }

  async function signOut() {
    session.current++; loadVersion.current++; sendLock.current = false;
    microphone.stop(); clearTimeout(motionTimer.current);
    setUser(null); setConversations([]); setMessages([]); setFiles([]); setInput('');
    setActiveId(null); setHistoryOpen(false); setSettingsOpen(false);
    setSending(false); setUploading(false); setSavingPrefs(false); setPrefs(defaultPrefs);
    setMessageCursor(null); setConversationCursor(null); setErrorText(''); setDataReady(false);
    try { await auth.signOut(); }
    catch { setErrorText('تعذر إكمال تسجيل الخروج. أعد المحاولة قبل استخدام جهاز مشترك.'); }
  }

  async function newConversation() {
    if(sendLock.current || !dataReady) return;
    const epoch = session.current;
    try {
      const response = await api.post('/api/conversations', { title: 'محادثة جديدة' });
      if(epoch !== session.current) return;
      const conversation = response.data.conversation as Conversation;
      setConversations(previous => [conversation, ...previous]);
      setActiveId(conversation.id); setMessages([]); setFiles([]); setHistoryOpen(false); animate('wave',1800);
    } catch { if(epoch === session.current) setErrorText('تعذر إنشاء المحادثة. جرّب تاني.'); }
  }

  async function deleteConversation(id: string) {
    if(sendLock.current || !confirm('تحذف المحادثة دي نهائيًا؟')) return;
    const epoch=session.current;
    try {
      // Each backend call deletes one bounded page; interrupted deletion can be retried.
      for(let page=0;page<200;page++) {
        const response=await api.delete('/api/conversations/'+id);
        if(epoch!==session.current)return;
        if(response.data.deleted) {
          setConversations(previous=>previous.filter(c=>c.id!==id));
          if(currentId.current===id){setActiveId(null);setMessages([]);}
          return;
        }
      }
      setErrorText('الحذف لسه مخلصش. اضغط حذف تاني عشان يكمل.');
    } catch { if(epoch===session.current)setErrorText('تعذر إكمال الحذف. جرّب تاني.'); }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sendLock.current || loadingMessages || !dataReady) return;
    sendLock.current = true;
    microphone.stop();
    const epoch = session.current;
    const conversationAtSend = activeId;
    const current = () => epoch === session.current;

    setInput('');
    setSending(true);
    setErrorText('');
    animate(prefs.autoResearch && /آخر|أحدث|احدث|اليوم|سعر|أخبار|اخبار|دلوقتي|ابحث|دور|latest|today|price|search/i.test(text) ? 'search' : 'idea', 0);

    const optimistic: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    setMessages((previous) => [...previous, optimistic]);

    try {
      const response = await api.post('/api/chat', {
        conversationId: activeId,
        message: text,
        autoResearch: prefs.autoResearch,
      });
      if(!current()) return;
      const conversation = response.data.conversation as Conversation;
      const answer = response.data.message as Message;

      if(!conversationAtSend) setActiveId(conversation.id);
      setConversations((previous) => [
        conversation,
        ...previous.filter((item) => item.id !== conversation.id),
      ]);
      setMessages((previous) => [
        ...previous.filter((message) => message.id !== optimistic.id),
        { ...optimistic, id: response.data.userMessageId },
        answer,
      ]);

      if(answer.sources?.length) {
        animate('found', 0);
        motionTimer.current = window.setTimeout(() => animate('talk', Math.min(7000, Math.max(1400, answer.content.length*31))), 800);
      } else animate('talk', Math.min(7000, Math.max(1400, answer.content.length*31)));
    } catch {
      if(!current()) return;
      setMessages((previous) => previous.filter((message) => message.id !== optimistic.id));
      setInput(text);
      setErrorText('حصلت مشكلة أثناء إرسال الرسالة. جرّب تاني.');
      animate('idle', 0);
    } finally {
      if(current()) { setSending(false); sendLock.current = false; }
    }
  }

  async function saveGender(gender: Exclude<UserGender, null>) {
    await savePreferences({ ...prefs, gender });
  }

  async function savePreferences(next: Preferences) {
    if(savingPrefs) return;
    const epoch = session.current;
    setErrorText('');
    setSavingPrefs(true);
    try {
      const response=await api.put('/api/settings', next);
      if(epoch===session.current)setPrefs(response.data.preferences);
    } catch { if(epoch===session.current)setErrorText('الإعدادات متحفظتش. جرّب تاني.'); }
    finally { if(epoch===session.current)setSavingPrefs(false); }
  }

  async function uploadFile(file: File) {
    if (!file) return;
    const epoch = session.current;
    setUploading(true);
    setErrorText('');
    try {
      if (file.size > 2 * 1024 * 1024 || !['image/png','image/jpeg','application/pdf','text/plain'].includes(file.type)) throw new Error('size');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await api.post('/api/files', {
        name: file.name,
        contentType: file.type || 'text/plain',
        base64,
      });
      if(epoch !== session.current) return;
      setFiles(previous => [...previous, response.data.file]);
      setErrorText('اتحفظ الملف في حسابك. تحليل محتواه داخل المحادثة لسه مش متاح.');
    } catch {
      if(epoch === session.current) setErrorText('تعذر رفع الملف. المسموح PNG وJPEG وPDF وTXT لحد 2MB.');
    } finally {
      if(epoch === session.current)setUploading(false);
    }
  }

  if (loadingAuth) {
    return (
      <main className='outside-shell' dir='rtl'>
        <DaiLogo className='outside-logo loading' />
      </main>
    );
  }

  if (!user) {
    return (
      <main className='outside-shell' dir='rtl'>
        <div className='outside-stars' />
        <section className='outside-login-card'>
          <DaiLogo className='outside-logo' />
          <h1>DAI AI</h1>
          <p>ضي · رفيقة أفكارك</p>
          <button onClick={signIn} className='outside-login-button'>
            <LogIn className='h-5 w-5' />
            تسجيل الدخول
          </button>
          <div className='outside-security'>
            <ShieldCheck className='h-4 w-4' />
            <span>تسجيل دخول آمن</span>
          </div>
          {errorText && <div className='classic-error'>{errorText}</div>}
        </section>
      </main>
    );
  }

  if (dataReady && !prefs.gender) {
    return (
      <main className='outside-shell' dir='rtl'>
        <div className='outside-stars' />
        <section className='outside-login-card gender-onboarding-card'>
          <DaiLogo className='outside-logo' />
          <h1>أهلاً بيك عند ضي</h1>
          <p>اختار نوعك عشان ضي تعرف تخاطبك بالطريقة المناسبة.</p>
          <div className='gender-onboarding-options' role='group' aria-label='اختيار النوع'>
            <button disabled={savingPrefs} onClick={() => saveGender('male')} className='outside-login-button gender-choice'>
              ذكر
            </button>
            <button disabled={savingPrefs} onClick={() => saveGender('female')} className='outside-login-button gender-choice'>
              أنثى
            </button>
          </div>
          <div className='outside-security'>
            <ShieldCheck className='h-4 w-4' />
            <span>الاختيار بيتحفظ على حسابك عشان ضي تستخدم الصيغة المناسبة.</span>
          </div>
          {errorText && <div className='classic-error'>{errorText}</div>}
          <button disabled={savingPrefs} onClick={signOut} className='gender-signout'>تسجيل الخروج</button>
        </section>
      </main>
    );
  }

  return (
    <main className='classic-shell' dir='rtl'>
      <div className='classic-bg-grid' />

      <header className='classic-header'>
        <div className='classic-brand'>
          <DaiLogo />
          <div>
            <strong>DAI AI</strong>
            <span>ضي · رفيقة أفكارك</span>
          </div>
        </div>

        <div className='classic-header-actions'>
          <span className='classic-status'>
            <i className={sending ? 'busy' : ''} />
            {sending ? 'بفكر معاك…' : 'جاهزة'}
          </span>
          <button onClick={() => setHistoryOpen(true)} className='classic-icon-button' aria-label='المحادثات'>
            <History className='h-5 w-5' />
          </button>
          <button onClick={() => setSettingsOpen(true)} className='classic-icon-button' aria-label='الإعدادات'>
            <Settings className='h-5 w-5' />
          </button>
          <button onClick={signOut} className='classic-icon-button danger' aria-label='تسجيل الخروج'>
            <LogOut className='h-5 w-5' />
          </button>
        </div>
      </header>

      <section className='classic-stage'>
        <div className='classic-face-wrap classic-logo-stage'>
          <DaiFace state={daiState} reduced={reduced} />
          <DaiLogo className='classic-center-logo' />
        </div>

        <div className='classic-motion-controls'>
          <button disabled={sending || microphone.listening} onClick={() => animate('fishing',7400)}>صيد</button>
          <button disabled={sending || microphone.listening} onClick={() => animate('heart',3800)}>قلب</button>
          <button disabled={sending || microphone.listening} onClick={() => animate('dance',4800)}>رقصة</button>
          <button aria-pressed={reduced} onClick={() => setReduced(!reduced)}>حركة هادية</button>
          <button disabled={sending || microphone.listening} onClick={() => animate('wave', 3800)}>تحية</button>
          <button disabled={sending || microphone.listening} onClick={() => animate('happy', 3800)}>فرحة</button>
          <button disabled={sending || microphone.listening} onClick={() => animate('idea', 3800)}>فكرة</button>
          <button disabled={sending || microphone.listening} onClick={() => animate('search', 3800)}>بحث</button>
          <button disabled={sending || microphone.listening} onClick={() => animate('sleep', 5400)}>نعاس</button>
        </div>

        <section className='classic-response-card'>
          <span className='classic-response-label'>ضي</span>
          <p>
            {sending
              ? daiState === 'search' ? 'ببحث وبفكر معاك…' : 'بفكر معاك…'
              : loadingMessages ? 'بحمّل المحادثة…' : latestAssistant?.content || 'أنا ضي… قولي إيه اللي في بالك؟'}
          </p>
          {!!latestAssistant?.sources?.length && (
            <div className='classic-sources'>
              <Search className='h-3.5 w-3.5' />
              {latestAssistant.sources.slice(0, 3).map((source, index) => (
                <a key={source.url + index} href={/^https?:\/\//i.test(source.url) ? source.url : undefined} target='_blank' rel='noreferrer'>
                  {source.title}
                </a>
              ))}
            </div>
          )}
        </section>

        {errorText && <div className='classic-error stage-error'>{errorText}</div>}

        <details className='conversation-transcript'><summary>نص المحادثة ({messages.length})</summary>
          {messages.map(message => <article key={message.id}><strong>{message.role==='user'?'أنت':'ضي'}</strong><p dir='auto'>{message.content}</p></article>)}
          {messageCursor && <button disabled={loadingMessages || !dataReady} onClick={loadMoreMessages}>تحميل باقي الرسائل</button>}
        </details>
        <section className='classic-input-bar'>
          <div className='classic-mini-dai'>
            <span /><i /><i />
          </div>

          <textarea
            disabled={loadingMessages || !dataReady}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder='اكتب لضي...'
          />

          <label className='classic-input-icon'>
            <Paperclip className='h-5 w-5' />
            <input
              aria-label='رفع ملف'
              type='file'
              className='hidden'
              accept='.png,.jpg,.jpeg,.pdf,.txt'
              disabled={uploading || sending}
              onChange={(event) => event.target.files?.[0] && uploadFile(event.target.files[0])}
            />
          </label>

          <button onClick={microphone.toggle} disabled={sending || !microphone.supported} title={microphone.supported ? 'إملاء صوتي عبر خدمة المتصفح؛ قد يُرسل الصوت لمزود المتصفح' : 'الإملاء الصوتي غير متاح في المتصفح ده'} className='classic-input-icon' aria-pressed={microphone.listening} aria-label={microphone.listening ? 'إيقاف الميكروفون' : 'الميكروفون'}>
            <Mic className='h-5 w-5' />
          </button>

          <button onClick={sendMessage} disabled={!input.trim() || sending || loadingMessages || !dataReady} className='classic-send' aria-label='إرسال'>
            <Send className='h-5 w-5' />
          </button>
        </section>

        {files.length > 0 && <div className='classic-sources'>{files.map((file,i) => <a key={i} href={file.url} target='_blank' rel='noopener noreferrer'>{file.name}</a>)}</div>}
        <p className='classic-hint'>Enter للإرسال · Shift + Enter لسطر جديد · اضغط على حركات ضي للتفاعل</p>
      </section>

      {historyOpen && (
        <div className='classic-overlay' onMouseDown={() => setHistoryOpen(false)}>
          <aside className='classic-drawer' onMouseDown={(event) => event.stopPropagation()}>
            <div className='classic-drawer-head'>
              <div>
                <span>DAI AI</span>
                <h3>المحادثات</h3>
              </div>
              <button onClick={() => setHistoryOpen(false)} className='classic-icon-button' aria-label='إغلاق'>
                <X className='h-5 w-5' />
              </button>
            </div>

            {errorText && <p className='classic-error' role='alert'>{errorText}</p>}
            <button disabled={sending || !dataReady} onClick={newConversation} className='classic-new-chat'>محادثة جديدة</button>

            <div className='classic-history-list'>
              {conversations.length === 0 && <p>مفيش محادثات محفوظة لسه.</p>}
              {conversations.map((conversation) => (
                <div key={conversation.id} className={'classic-history-row ' + (activeId === conversation.id ? 'active' : '')}>
                  <button
                    onClick={() => {
                      if(sendLock.current) return;
                      setActiveId(conversation.id);
                      setFiles([]);
                      setHistoryOpen(false);
                    }}
                  >
                    {conversation.title}
                  </button>
                  <button disabled={sending} onClick={() => deleteConversation(conversation.id)} aria-label='حذف'>
                    <Trash2 className='h-4 w-4' />
                  </button>
                </div>
              ))}
            </div>
          {conversationCursor && <button className='classic-new-chat' onClick={loadMoreConversations}>تحميل المزيد</button>}
          </aside>
        </div>
      )}

      {settingsOpen && (
        <div className='classic-overlay' onMouseDown={() => setSettingsOpen(false)}>
          <section className='classic-settings' onMouseDown={(event) => event.stopPropagation()}>
            <div className='classic-drawer-head'>
              <div>
                <span>DAI AI</span>
                <h3>الإعدادات والخصوصية</h3>
              </div>
              <button onClick={() => setSettingsOpen(false)} className='classic-icon-button' aria-label='إغلاق'>
                <X className='h-5 w-5' />
              </button>
            </div>

            {errorText && <p className='classic-error' role='alert'>{errorText}</p>}
            <label className='classic-setting'>
              <input
                disabled={savingPrefs}
                type='checkbox'
                checked={prefs.autoResearch}
                onChange={(event) => savePreferences({ ...prefs, autoResearch: event.target.checked })}
              />
              <span><strong>البحث التلقائي</strong><small>ضي تدور على مصادر لما السؤال محتاج معلومات حديثة.</small></span>
            </label>

            <label className='classic-setting'>
              <input
                disabled={savingPrefs}
                type='checkbox'
                checked={prefs.saveSearchHistory}
                onChange={(event) => savePreferences({ ...prefs, saveSearchHistory: event.target.checked })}
              />
              <span><strong>حفظ سجل البحث</strong><small>تقدر توقف حفظ سجل البحث المنفصل.</small></span>
            </label>

            <div className='classic-privacy'>
              <ShieldCheck className='h-5 w-5' />
              محادثات كل مستخدم منفصلة ومحميّة بتسجيل الدخول.
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
