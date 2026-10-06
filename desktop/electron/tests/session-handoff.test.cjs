const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { createClient } = require('@supabase/supabase-js');

const appUrl = 'https://ashraftefa97-beep.github.io/DAI-development/';
const authOrigin = 'https://buenonmbyudjhpedmoqk.supabase.co';
const session = { access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_in: 3600, token_type: 'bearer' };
const user = { id: '9dc13232-ecdd-40df-b8b2-eac2bc316d28', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

test('existing page misses fragment; a fresh document imports and persists the real Supabase SDK session', async () => {
  const { sessionReturnUrl, waitForRendererSession } = require('../desktop-oauth.cjs');
    const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  let dom;
  let client;
  let requests = 0;
  const startPage = url => {
    dom = new JSDOM('', { url, runScripts: 'outside-only' });
    Object.defineProperty(dom.window, 'localStorage', { value: storage });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.BroadcastChannel = undefined;
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
    client = createClient(authOrigin, 'public-fixture-key', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: async url => {
        assert.equal(new URL(url).pathname, '/auth/v1/user');
        requests++;
        return new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } },
    });
    return client;
  };
  const closePage = () => { client.auth.stopAutoRefresh(); dom.window.close(); };
  try {
    startPage(appUrl);
    assert.equal((await client.auth.getSession()).data.session, null);
    const oldReturn = new URL(appUrl);
    oldReturn.hash = new URLSearchParams(session).toString();
    dom.reconfigure({ url: oldReturn.toString() });
    assert.equal((await client.auth.getSession()).data.session, null);
    assert.equal(requests, 0, 'old fragment-only return never initializes the login');
    closePage();

    const returnUrl = new URL(sessionReturnUrl(appUrl, session));
    assert.notEqual(returnUrl.search, new URL(appUrl).search, 'changed query forces a new document');
    assert.equal(new URLSearchParams(returnUrl.hash.slice(1)).get('access_token'), session.access_token);
    assert.equal(returnUrl.search.includes(session.access_token), false, 'credentials remain outside server request URLs');
    startPage(returnUrl.toString());
    const initialized = await client.auth.initialize();
    assert.equal(initialized.error, null);
    const imported = await client.auth.getSession();
    assert.equal(imported.error, null);
    assert.equal(imported.data.session.user.id, user.id);
    assert.equal(imported.data.session.access_token, session.access_token);
    assert.equal(requests, 1, 'SDK validates user after desktop return');
    assert.equal(dom.window.location.hash, '', 'SDK removes credentials from address');
    await waitForRendererSession({
      isDestroyed: () => false,
      getURL: () => dom.window.location.href,
      executeJavaScript: script => Promise.resolve(dom.window.eval(script)),
    }, appUrl, authOrigin, session, 1000);
    closePage();

    startPage(appUrl);
    const restored = await client.auth.getSession();
    assert.equal(restored.data.session.user.id, user.id);
    assert.equal(restored.data.session.refresh_token, session.refresh_token);
    assert.equal(requests, 1, 'reopening restores saved session');
  } finally { closePage(); }
});

test('native confirmation refuses a foreign document or an unsaved session', async () => {
  const { waitForRendererSession } = require('../desktop-oauth.cjs');
  let executed = false;
  const contents = { isDestroyed: () => false, getURL: () => 'https://example.invalid/', executeJavaScript: async () => { executed = true; return true; } };
  await assert.rejects(waitForRendererSession(contents, appUrl, authOrigin, session), /oauth_session_not_saved/);
  assert.equal(executed, false);
  contents.getURL = () => appUrl;
  contents.executeJavaScript = async () => false;
  await assert.rejects(waitForRendererSession(contents, appUrl, authOrigin, session, 1), /oauth_session_not_saved/);
});
