import { type ReactNode, useEffect, useState } from 'react';
import { LogIn, LogOut, UserPlus } from 'lucide-react';
import { authConfigured, supabase } from './supabaseClient';

type Mode = 'login' | 'register';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  function getUserName(user:any){
    return String(
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      ''
    ).trim();
  }

  function applySessionUser(user:any){
    const emailValue=String(user?.email||'');
    const nameValue=getUserName(user);
    setSessionEmail(emailValue);
    setSessionName(nameValue);
    setProfileName(nameValue);
    setNeedsName(Boolean(user&&emailValue&&!nameValue));
  }

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      applySessionUser(data.session?.user || null);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySessionUser(session?.user || null);
      setReady(true);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit() {
    if (!supabase || !email.trim() || password.length < 6 || busy) return;
    if (mode === 'register' && name.trim().length < 2) {
      setNotice('اكتب اسمك الأول عشان ضي تناديك بيه.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + window.location.pathname,
            data: {
              display_name: name.trim(),
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          applySessionUser(data.session.user);
        } else {
          setNotice('تم إنشاء الحساب. افتح رسالة التأكيد في بريدك الإلكتروني ثم ارجع سجّل الدخول.');
          setMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        applySessionUser(data.user);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/invalid login/i.test(message)) setNotice('البريد أو كلمة المرور غير صحيحة.');
      else if (/already registered/i.test(message)) setNotice('الحساب موجود بالفعل. جرّب تسجيل الدخول.');
      else if (/password/i.test(message)) setNotice('كلمة المرور لازم تكون 6 أحرف على الأقل.');
      else setNotice('حصلت مشكلة في تسجيل الدخول. جرّب مرة تانية.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfileName() {
    if (!supabase || profileName.trim().length < 2 || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: profileName.trim() },
      });
      if (error) throw error;
      applySessionUser(data.user);
      setNeedsName(false);
    } catch {
      setNotice('الاسم متحفظش. جرّب تاني.');
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    if (!supabase || busy) return;
    setBusy(true);
    setNotice('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) {
      setNotice('تعذر بدء تسجيل الدخول بجوجل.');
      setBusy(false);
    }
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSessionEmail('');
    setSessionName('');
    setNeedsName(false);
  }

  if (!ready) {
    return (
      <main className='auth-shell' dir='rtl'>
        <img className='auth-logo auth-loading' src='./dai-logo.svg' alt='DAI AI' />
      </main>
    );
  }

  if (!authConfigured) {
    return (
      <main className='auth-shell' dir='rtl'>
        <section className='auth-card'>
          <img className='auth-logo' src='./dai-logo.svg' alt='DAI AI' />
          <h1>DAI AI</h1>
          <p>نظام تسجيل الدخول اتجهّز، وناقص توصيل بيانات Supabase فقط.</p>
          <div className='auth-setup-note'>
            هنضيف Project URL وPublishable Key في ملف <b>auth-config.js</b>، وبعدها التسجيل هيشتغل مباشرة.
          </div>
        </section>
      </main>
    );
  }

  if (!sessionEmail) {
    return (
      <main className='auth-shell' dir='rtl'>
        <section className='auth-card'>
          <img className='auth-logo' src='./dai-logo.svg' alt='DAI AI' />
          <h1>DAI AI</h1>
          <p>{mode === 'login' ? 'سجّل دخولك وكمل مع ضي' : 'اعمل حساب جديد'}</p>

          <div className='auth-tabs'>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setNotice(''); }}>تسجيل الدخول</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setNotice(''); }}>إنشاء حساب</button>
          </div>

          {mode === 'register' && (
            <label className='auth-field'>
              <span>اسمك</span>
              <input type='text' value={name} onChange={e => setName(e.target.value)} autoComplete='name' placeholder='مثال: أحمد' maxLength={40} />
            </label>
          )}

          <label className='auth-field'>
            <span>البريد الإلكتروني</span>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} autoComplete='email' placeholder='name@example.com' />
          </label>

          <label className='auth-field'>
            <span>كلمة المرور</span>
            <input
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder='6 أحرف على الأقل'
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            />
          </label>

          {notice && <div className='auth-notice'>{notice}</div>}

          <button className='auth-primary' disabled={busy || !email.trim() || password.length < 6 || (mode === 'register' && name.trim().length < 2)} onClick={submit}>
            {mode === 'login' ? <LogIn className='h-5 w-5' /> : <UserPlus className='h-5 w-5' />}
            {busy ? 'جاري التنفيذ…' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
          </button>

          <div className='auth-divider'><span>أو</span></div>

          <button className='auth-google' disabled={busy} onClick={googleLogin}>
            متابعة باستخدام Google
          </button>
        </section>
      </main>
    );
  }

  if (sessionEmail && needsName) {
    return (
      <main className='auth-shell' dir='rtl'>
        <section className='auth-card'>
          <img className='auth-logo' src='./dai-logo.svg' alt='DAI AI' />
          <h1>اسمك عند ضي</h1>
          <p>اكتب الاسم اللي تحب ضي تناديك بيه. الاسم بيتحفظ على حسابك أنت بس.</p>

          <label className='auth-field'>
            <span>الاسم</span>
            <input
              type='text'
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              autoComplete='name'
              placeholder='مثال: أحمد'
              maxLength={40}
              onKeyDown={e => { if (e.key === 'Enter') saveProfileName(); }}
            />
          </label>

          {notice && <div className='auth-notice'>{notice}</div>}

          <button className='auth-primary' disabled={busy || profileName.trim().length < 2} onClick={saveProfileName}>
            <UserPlus className='h-5 w-5' />
            {busy ? 'جاري الحفظ…' : 'احفظ الاسم وكمل'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className='auth-session-pill' dir='rtl'>
        <span>{sessionName || sessionEmail}</span>
        <button onClick={logout} aria-label='تسجيل الخروج'><LogOut className='h-4 w-4' /></button>
      </div>
      {children}
    </>
  );
}
