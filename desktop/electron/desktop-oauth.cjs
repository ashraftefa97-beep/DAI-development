const http = require('node:http');
const crypto = require('node:crypto');

function isGoogleAuthorizationUrl(value, authOrigin) {
  try {
    const url = new URL(value);
    return url.origin === authOrigin && url.pathname === '/auth/v1/authorize' &&
      url.searchParams.get('provider') === 'google';
  } catch { return false; }
}

function sessionReturnUrl(appUrl, session) {
  const url = new URL(appUrl);
  const expiresIn = Number(session?.expires_in);
  if (typeof session?.access_token !== 'string' || !session.access_token ||
      typeof session?.refresh_token !== 'string' || !session.refresh_token ||
      !Number.isFinite(expiresIn) || expiresIn <= 0 ||
      session.token_type !== 'bearer') {
    throw new Error('invalid_session');
  }
  // A fragment-only loadURL is a same-document navigation in Chromium. The
  // existing Supabase client has already initialized and will miss the tokens.
  // Change the query so each return creates a document and initializes auth.
  // This value is a random navigation marker, never a credential.
  url.searchParams.set('dai_desktop_auth', crypto.randomUUID());
  url.hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(expiresIn),
    token_type: 'bearer',
  }).toString();
  return url.toString();
}

function resultPage(message, font) {
  const fontFace = font ? `@font-face{font-family:Rabie;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-display:swap}` : '';
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DAI AI — ضي</title><style>${fontFace}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101321;color:#fff7ec;font:18px Rabie,Arial,sans-serif}main{text-align:center;padding:36px;max-width:480px}h1{font-size:36px;color:#ffd4e1}p{line-height:1.8;color:#cbc5da}</style><main><h1>ضي AI</h1><p>${message}</p></main></html>`;
}

async function waitForRendererSession(webContents, appUrl, authOrigin, session, timeoutMs = 30000) {
  const expectedPage = new URL(appUrl);
  const storageKey = `sb-${new URL(authOrigin).hostname.split('.')[0]}-auth-token`;
  const script = `(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}));
      return Boolean(saved && saved.access_token === ${JSON.stringify(session.access_token)} &&
        saved.refresh_token && saved.user && saved.user.id &&
        saved.expires_at > Date.now() / 1000 &&
        !new URLSearchParams(location.hash.slice(1)).has('access_token'));
    } catch { return false; }
  })()`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (webContents.isDestroyed()) throw new Error('oauth_cancelled');
    const page = new URL(webContents.getURL());
    if (page.origin !== expectedPage.origin || page.pathname !== expectedPage.pathname) {
      throw new Error('oauth_session_not_saved');
    }
    // Read only the trusted DAI document. Return a boolean, never credentials.
    if (await webContents.executeJavaScript(script) === true) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('oauth_session_not_saved');
}

async function startGoogleOAuth({ authOrigin, publishableKey, openExternal,
  fetchImpl = fetch, timeoutMs = 300000, font }) {
  const nonce = crypto.randomBytes(24).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const callbackPath = '/dai-auth/' + nonce;
  let callbackUrl = '';
  let settled = false;
  let consuming = false;
  let timer;
  let resolveResult, rejectResult;
  const result = new Promise((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  // A browser-opening failure can happen before the caller awaits this promise.
  result.catch(() => {});

  const reply = (res, status, message) => {
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'",
    });
    res.end(resultPage(message, font));
  };
  const finish = (error, session) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    server.close();
    server.closeIdleConnections();
    if (error) rejectResult(error); else resolveResult(session);
  };
  const server = http.createServer(async (req, res) => {
    const expectedHost = new URL(callbackUrl).host;
    if (req.method !== 'GET' || req.headers.host !== expectedHost ||
        req.headers.origin || req.url.length > 4096) {
      reply(res, 400, 'طلب غير صالح. ارجع لضي وحاول مرة أخرى.');
      return;
    }
    const callback = new URL(req.url, callbackUrl);
    if (callback.pathname !== callbackPath) {
      reply(res, 404, 'الصفحة غير موجودة.');
      return;
    }
    if (settled || consuming) {
      reply(res, 409, 'جاري إكمال تسجيل الدخول. ارجع لضي.');
      return;
    }
    if (callback.searchParams.has('error')) {
      reply(res, 400, 'لم يكتمل تسجيل الدخول. ارجع لضي وحاول مرة أخرى.');
      finish(new Error('oauth_cancelled'));
      return;
    }
    const code = callback.searchParams.get('code');
    if (!code || code.length > 1024) {
      reply(res, 400, 'رابط تسجيل الدخول غير مكتمل.');
      return;
    }
    consuming = true;
    try {
      const response = await fetchImpl(authOrigin + '/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('oauth_exchange_failed');
      const session = await response.json();
      // Validate before delivering a session to the trusted DAI renderer.
      sessionReturnUrl('https://dai.invalid/', session);
      if (settled) { reply(res, 410, 'انتهت محاولة تسجيل الدخول. ارجع لضي.'); return; }
      reply(res, 200, 'تم تأكيد حساب جوجل. ارجع لضي على الكمبيوتر لإكمال تسجيل الدخول.');
      finish(null, session);
    } catch {
      reply(res, 400, 'تعذر إكمال تسجيل الدخول. ارجع لضي وحاول مرة أخرى.');
      finish(new Error('oauth_exchange_failed'));
    }
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  callbackUrl = `http://127.0.0.1:${server.address().port}${callbackPath}`;
  timer = setTimeout(() => finish(new Error('oauth_timeout')), timeoutMs);
  timer.unref();
  const authorization = new URL('/auth/v1/authorize', authOrigin);
  authorization.searchParams.set('provider', 'google');
  authorization.searchParams.set('redirect_to', callbackUrl);
  authorization.searchParams.set('code_challenge', challenge);
  authorization.searchParams.set('code_challenge_method', 's256');
  authorization.searchParams.set('prompt', 'select_account');
  try {
    await openExternal(authorization.toString());
  } catch {
    finish(new Error('oauth_browser_failed'));
    throw new Error('oauth_browser_failed');
  }
  return { result, cancel: () => finish(new Error('oauth_cancelled')) };
}

module.exports = { isGoogleAuthorizationUrl, sessionReturnUrl, startGoogleOAuth, waitForRendererSession };
