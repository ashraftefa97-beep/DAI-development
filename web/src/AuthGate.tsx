import { type ReactNode, useEffect, useState } from 'react';
import { Download, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, Sparkles, Trash2, UserCog, UserPlus, X } from 'lucide-react';
import { authConfigured, supabase } from './supabaseClient';

type Mode = 'login' | 'register';
type UserGender = 'male' | 'female' | '';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<UserGender>('');
  const [profileName, setProfileName] = useState('');
  const [profileGender, setProfileGender] = useState<UserGender>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const companionMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('companion') === '1';

  function getUserName(user:any){
    return String(
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      ''
    ).trim();
  }

  function getUserGender(user:any): UserGender {
    const value = String(user?.user_metadata?.gender || '');
    return value === 'male' || value === 'female' ? value : '';
  }

  function applySessionUser(user:any){
    const emailValue=String(user?.email||'');
    const nameValue=getUserName(user);
    const genderValue=getUserGender(user);
    setSessionEmail(emailValue);
    setSessionName(nameValue);
    setProfileName(nameValue);
    setProfileGender(genderValue);
    setNeedsName(Boolean(user&&emailValue&&(!nameValue||!genderValue)));
  }

  useEffect(() => {
    if (companionMode) return;
    const openAccount=()=>{
      setAccountNotice('');
      setAccountOpen(true);
    };
    const signOut=()=>{ void logout('local'); };
    window.addEventListener('dai:open-account',openAccount as EventListener);
    window.addEventListener('dai:logout',signOut as EventListener);
    return ()=>{
      window.removeEventListener('dai:open-account',openAccount as EventListener);
      window.removeEventListener('dai:logout',signOut as EventListener);
    };
  }, [companionMode]);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;
    let bootstrapSettled = false;

    const finishBootstrap = (message = '') => {
      if (!mounted) return;
      bootstrapSettled = true;
      if (message) setNotice(message);
      setReady(true);
    };

    // Never let a stalled auth SDK/local-storage lock trap DAI on the logo
    // forever. A late auth event can still restore the session afterwards.
    const bootstrapTimeout = window.setTimeout(() => {
      if (!bootstrapSettled) {
        finishBootstrap('تسجيل الدخول اتأخر شوية. تقدر تحاول الدخول من جديد.');
      }
    }, 3500);

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.warn('DAI auth session restore failed', error.message);
          finishBootstrap('تعذر استعادة الجلسة القديمة. سجّل دخولك من جديد.');
          return;
        }
        applySessionUser(data.session?.user || null);
        finishBootstrap();
      })
      .catch((error) => {
        if (!mounted) return;
        console.warn('DAI auth bootstrap failed', error);
        finishBootstrap('تعذر استعادة الجلسة القديمة. سجّل دخولك من جديد.');
      })
      .finally(() => {
        window.clearTimeout(bootstrapTimeout);
      });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      applySessionUser(session?.user || null);
      if (!session) void (window as any).daiDesktop?.clearSession?.().catch?.(() => false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      finishBootstrap();
    });

    return () => {
      mounted = false;
      window.clearTimeout(bootstrapTimeout);
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit() {
    if (!supabase || !email.trim() || password.length < 8 || busy) return;
    if (mode === 'register' && name.trim().length < 2) {
      setNotice('اكتب اسمك الأول عشان ضي تناديك بيه.');
      return;
    }
    if (mode === 'register' && !gender) {
      setNotice('اختار ذكر أو أنثى عشان ضي تعرف تخاطبك بصيغة مناسبة.');
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
              gender,
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
      else if (/password/i.test(message)) setNotice('كلمة المرور لازم تكون 8 أحرف على الأقل.');
      else setNotice('حصلت مشكلة في تسجيل الدخول. جرّب مرة تانية.');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfileName() {
    if (!supabase || profileName.trim().length < 2 || !profileGender || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: profileName.trim(), gender: profileGender },
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

  async function sendPasswordReset() {
    if (!supabase || !email.trim() || busy) {
      setNotice('اكتب بريدك الإلكتروني الأول.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) throw error;
      setNotice('بعتنا رابط تغيير كلمة المرور لو البريد مسجل عندنا.');
    } catch {
      setNotice('تعذر إرسال رابط الاسترجاع دلوقتي. جرّب تاني.');
    } finally {
      setBusy(false);
    }
  }

  async function finishPasswordRecovery() {
    if (!supabase || recoveryPassword.length < 8 || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
      if (error) throw error;
      setRecoveryPassword('');
      setPasswordRecovery(false);
      setNotice('تم تغيير كلمة المرور.');
    } catch {
      setNotice('تعذر تغيير كلمة المرور. جرّب تاني.');
    } finally {
      setBusy(false);
    }
  }

  async function exportMyData() {
    if (!supabase || accountBusy) return;
    setAccountBusy(true);
    setAccountNotice('');
    try {
      const [
        { data: conversations, error: conversationsError },
        { data: messages, error: messagesError },
        { data: proMemory, error: memoryError },
      ] = await Promise.all([
        supabase.from('dai_conversations').select('id,title,created_at,updated_at').order('created_at',{ascending:true}),
        supabase.from('dai_messages').select('id,conversation_id,role,content,created_at').order('created_at',{ascending:true}),
        supabase.from('dai_pro_memory').select('enabled,content,updated_at').maybeSingle(),
      ]);
      if (conversationsError || messagesError) throw conversationsError || messagesError;
      if (memoryError && memoryError.code !== 'PGRST116') console.warn('DAI memory export skipped', memoryError.code);
      const payload = {
        product: 'DAI AI',
        exportedAt: new Date().toISOString(),
        account: { email: sessionEmail, displayName: sessionName },
        conversations: conversations || [],
        messages: messages || [],
        professionalMemory: proMemory || null,
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
      const link = document.createElement('a');
      link.href=url;
      link.download='dai-data-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAccountNotice('تم تجهيز نسخة من بياناتك.');
    } catch {
      setAccountNotice('تعذر تصدير البيانات دلوقتي.');
    } finally {
      setAccountBusy(false);
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

  async function logout(scope: 'local' | 'global' = 'local') {
    if (!supabase) return;
    await (window as any).daiDesktop?.clearSession?.().catch?.(() => false);
    await supabase.auth.signOut({ scope });
    setSessionEmail('');
    setSessionName('');
    setNeedsName(false);
    setAccountOpen(false);
  }

  async function saveAccountProfile() {
    if (!supabase || profileName.trim().length < 2 || !profileGender || accountBusy) return;
    setAccountBusy(true);
    setAccountNotice('');
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: profileName.trim(), gender: profileGender },
      });
      if (error) throw error;
      applySessionUser(data.user);
      setAccountNotice('تم حفظ بيانات الحساب.');
    } catch {
      setAccountNotice('ضي مقدرتش تحفظ بيانات الحساب دلوقتي.');
    } finally {
      setAccountBusy(false);
    }
  }

  async function changePassword() {
    if (!supabase || newPassword.length < 8 || accountBusy) return;
    setAccountBusy(true);
    setAccountNotice('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setAccountNotice('تم تغيير كلمة المرور.');
    } catch {
      setAccountNotice('تعذر تغيير كلمة المرور. جرّب تاني.');
    } finally {
      setAccountBusy(false);
    }
  }

  async function clearAllChats() {
    if (!supabase || accountBusy) return;
    if (!window.confirm('تمسح كل محادثاتك مع ضي نهائيًا؟ الإجراء ده مش بيرجع.')) return;
    setAccountBusy(true);
    setAccountNotice('');
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || '';
      if (!uid) throw new Error('session');
      const { error } = await supabase.from('dai_conversations').delete().eq('user_id', uid);
      if (error) throw error;
      setAccountNotice('تم مسح كل المحادثات.');
      window.setTimeout(() => window.location.reload(), 450);
    } catch {
      setAccountNotice('تعذر مسح المحادثات. جرّب تاني.');
    } finally {
      setAccountBusy(false);
    }
  }

  async function deleteAccount() {
    if (!supabase || accountBusy) return;
    const confirmation = window.prompt('لحذف الحساب نهائيًا اكتب: حذف');
    if (confirmation?.trim() !== 'حذف') return;

    setAccountBusy(true);
    setAccountNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: 'DELETE' },
      });
      if (error || !data?.deleted) throw error || new Error('delete-failed');
      await (window as any).daiDesktop?.clearSession?.().catch?.(() => false);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setSessionEmail('');
      setSessionName('');
      setAccountOpen(false);
      window.location.reload();
    } catch {
      setAccountNotice('تعذر حذف الحساب دلوقتي. جرّب تاني.');
    } finally {
      setAccountBusy(false);
    }
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
      <main className='auth-shell auth-login-shell' dir='rtl'>
        <div className='auth-layout'>
          <section className='auth-showcase' aria-label='مقدمة ضي'>
            <div className='auth-showcase-top'>
              <div className='auth-brand-lockup'>
                <img src='./dai-logo.svg' alt='' aria-hidden='true' />
                <div>
                  <strong>DAI AI</strong>
                  <span>ضي · رفيقة أفكارك</span>
                </div>
              </div>
              <span className='auth-private-pill'><ShieldCheck className='h-4 w-4' /> تجربة خاصة وآمنة</span>
            </div>

            <div className='auth-showcase-main'>
              <div className='auth-kicker'><Sparkles className='h-4 w-4' /> ذكاء شخصي ليومك</div>
              <h2>أفكارك، شغلك، يومك.<br/><em>كلهم مع ضي.</em></h2>
              <p>اسأل، ابحث، اتكلم، وابعت ملفاتك. ضي مصممة تبقى مساعدتك اليومية بهدوء وسرعة من غير زحمة.</p>

              <div className='auth-hero-mark' aria-hidden='true'>
                <div className='auth-hero-glow'/>
                <img src='./dai-logo.svg' alt='' />
                <i className='auth-orbit auth-orbit-one'/>
                <i className='auth-orbit auth-orbit-two'/>
              </div>

              <div className='auth-feature-pills' aria-label='مميزات ضي'>
                <span>بحث وفهم أسرع</span>
                <span>صوت طبيعي</span>
                <span>صور وملفات</span>
                <span>ذاكرة اختيارية</span>
              </div>
            </div>

            <div className='auth-showcase-foot'>
              <span className='auth-ready'><i/> ضي جاهزة</span>
              <span>Web · Desktop</span>
            </div>
          </section>

          <section className='auth-card auth-card-premium'>
            <div className='auth-mobile-brand' aria-hidden='true'>
              <div className='auth-mobile-brand-row'>
                <img src='./dai-logo.svg' alt='' />
                <div><strong>DAI AI</strong><span>ضي · رفيقة أفكارك</span></div>
              </div>
              <div className='auth-mobile-promise'>
                <span><i/> جاهزة لك</span>
                <strong>اسأل · ابحث · اتكلم</strong>
              </div>
            </div>

            <div className='auth-form-heading'>
              <span className='auth-eyebrow'>{mode === 'login' ? 'مرحبًا بعودتك' : 'أهلًا بيك في ضي'}</span>
              <h1>{mode === 'login' ? 'كمّل من حيث توقفت' : 'ابدأ رحلتك مع ضي'}</h1>
              <p>{mode === 'login' ? 'سجّل دخولك للوصول لمحادثاتك وإعداداتك.' : 'حساب واحد يحفظ تجربتك ويخلي ضي تعرف تخاطبك بالشكل المناسب.'}</p>
            </div>

            <div className='auth-tabs' role='tablist' aria-label='نوع الحساب'>
              <button type='button' role='tab' aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setNotice(''); }}>تسجيل الدخول</button>
              <button type='button' role='tab' aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setNotice(''); }}>إنشاء حساب</button>
            </div>

            {mode === 'register' && (
              <div className='auth-register-grid'>
                <label className='auth-field'>
                  <span>اسمك</span>
                  <input type='text' value={name} onChange={e => setName(e.target.value)} autoComplete='name' placeholder='مثال: أحمد' maxLength={40} />
                </label>
                <label className='auth-field'>
                  <span>النوع</span>
                  <select value={gender} onChange={e => setGender(e.target.value as UserGender)} aria-label='النوع'>
                    <option value=''>اختار</option>
                    <option value='male'>ذكر</option>
                    <option value='female'>أنثى</option>
                  </select>
                </label>
              </div>
            )}

            <label className='auth-field'>
              <span>البريد الإلكتروني</span>
              <input type='email' value={email} onChange={e => setEmail(e.target.value)} autoComplete='email' placeholder='name@example.com' inputMode='email' />
            </label>

            <label className='auth-field'>
              <span>كلمة المرور</span>
              <div className='auth-password-wrap'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder='8 أحرف على الأقل'
                  onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                />
                <button type='button' className='auth-password-toggle' onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                  {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
            </label>

            {mode === 'login' && (
              <button type='button' className='auth-text-button' disabled={busy} onClick={sendPasswordReset}>
                نسيت كلمة المرور؟
              </button>
            )}

            {notice && <div className='auth-notice' role='status'>{notice}</div>}

            <button className='auth-primary' disabled={busy || !email.trim() || password.length < 8 || (mode === 'register' && (name.trim().length < 2 || !gender))} onClick={submit}>
              {mode === 'login' ? <LogIn className='h-5 w-5' /> : <UserPlus className='h-5 w-5' />}
              {busy ? 'جاري التنفيذ…' : mode === 'login' ? 'دخول إلى ضي' : 'إنشاء الحساب'}
            </button>

            <div className='auth-divider'><span>أو</span></div>

            <button className='auth-google' disabled={busy} onClick={googleLogin}>
              <span className='auth-google-mark' aria-hidden='true'>G</span>
              متابعة باستخدام Google
            </button>

            <div className='auth-trust-note'>
              <ShieldCheck className='h-4 w-4' />
              <span>بيانات حسابك محمية، ومحادثاتك لا تظهر لأي مستخدم آخر.</span>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (sessionEmail && passwordRecovery) {
    return (
      <main className='auth-shell' dir='rtl'>
        <section className='auth-card'>
          <img className='auth-logo' src='./dai-logo.svg' alt='DAI AI' />
          <h1>غيّر كلمة المرور</h1>
          <p>اختار كلمة مرور جديدة لحسابك.</p>
          <label className='auth-field'>
            <span>كلمة المرور الجديدة</span>
            <input
              type='password'
              value={recoveryPassword}
              onChange={e => setRecoveryPassword(e.target.value)}
              autoComplete='new-password'
              placeholder='8 أحرف أو أكثر'
              onKeyDown={e => { if (e.key === 'Enter') finishPasswordRecovery(); }}
            />
          </label>
          {notice && <div className='auth-notice'>{notice}</div>}
          <button className='auth-primary' disabled={busy || recoveryPassword.length < 8} onClick={finishPasswordRecovery}>
            <KeyRound className='h-5 w-5' />
            {busy ? 'جاري الحفظ…' : 'احفظ كلمة المرور'}
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
          <h1>بياناتك عند ضي</h1>
          <p>اكتب الاسم اللي تحب ضي تناديك بيه واختار نوعك عشان تستخدم معاك الصيغة المناسبة.</p>

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

          <label className='auth-field'>
            <span>النوع</span>
            <select value={profileGender} onChange={e => setProfileGender(e.target.value as UserGender)} aria-label='النوع'>
              <option value=''>اختار</option>
              <option value='male'>ذكر</option>
              <option value='female'>أنثى</option>
            </select>
          </label>

          {notice && <div className='auth-notice'>{notice}</div>}

          <button className='auth-primary' disabled={busy || profileName.trim().length < 2 || !profileGender} onClick={saveProfileName}>
            <UserPlus className='h-5 w-5' />
            {busy ? 'جاري الحفظ…' : 'احفظ الاسم وكمل'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      {children}

      {!companionMode && accountOpen && (
        <div className='auth-account-overlay' onMouseDown={e => { if (e.target === e.currentTarget) setAccountOpen(false); }}>
          <section className='auth-account-panel' dir='rtl' role='dialog' aria-modal='true' aria-label='إدارة الحساب'>
            <header className='auth-account-head'>
              <div>
                <span>حسابك</span>
                <h2>إدارة الحساب والخصوصية</h2>
              </div>
              <button onClick={() => setAccountOpen(false)} aria-label='إغلاق'><X className='h-5 w-5' /></button>
            </header>

            <div className='auth-account-section'>
              <h3><UserCog className='h-4 w-4' /> بيانات ضي عنك</h3>
              <label className='auth-field'>
                <span>الاسم اللي ضي تناديك بيه</span>
                <input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={40} autoComplete='name' />
              </label>
              <label className='auth-field'>
                <span>النوع</span>
                <select value={profileGender} onChange={e => setProfileGender(e.target.value as UserGender)}>
                  <option value=''>اختار</option>
                  <option value='male'>ذكر</option>
                  <option value='female'>أنثى</option>
                </select>
              </label>
              <button className='auth-account-action' disabled={accountBusy || profileName.trim().length < 2 || !profileGender} onClick={saveAccountProfile}>
                حفظ البيانات
              </button>
            </div>

            <div className='auth-account-section'>
              <h3><KeyRound className='h-4 w-4' /> الأمان</h3>
              <label className='auth-field'>
                <span>كلمة مرور جديدة</span>
                <input
                  type='password'
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete='new-password'
                  placeholder='8 أحرف أو أكثر'
                />
              </label>
              <button className='auth-account-action' disabled={accountBusy || newPassword.length < 8} onClick={changePassword}>
                تغيير كلمة المرور
              </button>
              <button className='auth-account-secondary' disabled={accountBusy} onClick={() => logout('global')}>
                تسجيل خروج من كل الأجهزة
              </button>
            </div>

            <div className='auth-account-section auth-privacy-section'>
              <h3><ShieldCheck className='h-4 w-4' /> الخصوصية</h3>
              <p>المحادثات مرتبطة بحسابك ومحميّة بسياسات RLS. لو Professional، تقدر تفعّل ذاكرة اختيارية منفصلة من Control Center وتمسحها في أي وقت، وهي تدخل ضمن تصدير بياناتك.</p>
              <button className='auth-account-secondary' disabled={accountBusy} onClick={exportMyData}>
                <Download className='h-4 w-4' /> تصدير بياناتي
              </button>
              <button className='auth-account-secondary' disabled={accountBusy} onClick={clearAllChats}>
                مسح كل المحادثات
              </button>
            </div>

            <div className='auth-account-section danger'>
              <h3><Trash2 className='h-4 w-4' /> المنطقة الخطرة</h3>
              <p>حذف الحساب يمسح بيانات الحساب ومحادثاته نهائيًا.</p>
              <button className='auth-account-danger' disabled={accountBusy} onClick={deleteAccount}>
                حذف الحساب نهائيًا
              </button>
            </div>

            {accountNotice && <div className='auth-notice' role='status'>{accountNotice}</div>}
          </section>
        </div>
      )}
    </>
  );
}
