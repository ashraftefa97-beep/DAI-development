import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

test('Google IPC completes the actual login screen; cancellation resets the button; older desktop fragment returns also complete', async () => {
  const origin = 'https://buenonmbyudjhpedmoqk.supabase.co';
  const page = 'https://ashraftefa97-beep.github.io/DAI-development/';
  const dom = new JSDOM('<div id="root"></div>', { url: page });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator });
  globalThis.BroadcastChannel = undefined;
  const user = { id: '9dc13232-ecdd-40df-b8b2-eac2bc316d28', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { display_name: 'Fixture', gender: 'male' }, created_at: '2026-01-01T00:00:00Z' };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', exp: now + 3600, iat: now, iss: origin + '/auth/v1' })}.${Buffer.from('fixture-signature').toString('base64url')}`;
  const refresh_token = 'fixture-refresh-token';
  let validations = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const path = new URL(String(url)).pathname;
    if (path === '/auth/v1/user') { validations++; return new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
    if (path === '/auth/v1/logout') return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    throw new Error('Unexpected auth request: ' + path);
  };
  dom.window.DAI_AUTH_CONFIG = { url: origin, publishableKey: 'public-fixture-key' };
  dom.window.daiDesktop = { isDesktop: true, signInWithGoogle: async () => ({ ok: true, session: { access_token, refresh_token } }) };
  const { supabase } = await import('../src/supabaseClient.ts');
  const { default: AuthGate } = await import('../src/AuthGate.tsx');
  const root = createRoot(dom.window.document.getElementById('root'));
  const flush = () => new Promise(resolve => setImmediate(resolve));
  try {
    await act(async () => { root.render(React.createElement(AuthGate, null, React.createElement('div', { id: 'signed-in-app' }, 'DAI app'))); await supabase.auth.getSession(); await flush(); });
    assert.ok(dom.window.document.querySelector('.auth-google'));
    await act(async () => { dom.window.document.querySelector('.auth-google').click(); await flush(); await flush(); });
    assert.ok(dom.window.document.getElementById('signed-in-app'), 'actual AuthGate must leave the login form');
    assert.equal(validations, 1, 'real deployed Supabase SDK verifies the imported session');
    assert.equal(dom.window.location.href, page, 'new IPC flow finishes without navigating the app');
    const stored = JSON.parse(dom.window.localStorage.getItem('sb-buenonmbyudjhpedmoqk-auth-token'));
    assert.equal(stored.refresh_token, refresh_token);
    assert.equal(stored.user.id, user.id);

    await act(async () => { await supabase.auth.signOut({ scope: 'local' }); await flush(); });
    dom.window.daiDesktop.signInWithGoogle = async () => ({ ok: false, code: 'oauth_cancelled' });
    await act(async () => { dom.window.document.querySelector('.auth-google').click(); await flush(); });
    assert.equal(dom.window.document.querySelector('.auth-google').disabled, false, 'failed attempts must be retryable');
    assert.equal(dom.window.document.body.textContent.includes('جاري التنفيذ'), false);
    assert.equal(dom.window.document.body.textContent.includes('لم يكتمل تسجيل الدخول'), true);

    delete dom.window.daiDesktop.signInWithGoogle;
    await act(async () => {
      dom.window.history.replaceState(null, '', page + '#' + new URLSearchParams({ access_token, refresh_token, expires_in: '3600', token_type: 'bearer' }));
      dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
      await flush(); await flush();
    });
    assert.ok(dom.window.document.getElementById('signed-in-app'), 'existing desktop versions can import a late fragment');
    assert.equal(dom.window.location.hash, '', 'credential fragment is removed after session import');
    assert.equal(validations, 2);
    assert.equal((await supabase.auth.getSession()).data.session.user.id, user.id);
  } finally {
    await act(async () => { root.unmount(); });
    await supabase.auth.stopAutoRefresh();
    globalThis.fetch = previousFetch;
    dom.window.close();
  }
});
