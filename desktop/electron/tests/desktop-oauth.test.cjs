const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { startGoogleOAuth, sessionReturnUrl } = require('../desktop-oauth.cjs');
const authOrigin = 'https://buenonmbyudjhpedmoqk.supabase.co';
const session = { access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer' };

test('local callback exchanges the matching PKCE code and returns the session once', async () => {
  let authorization;
  let exchanges = 0;
  const attempt = await startGoogleOAuth({
    authOrigin, publishableKey: 'public-fixture-key',
    openExternal: async url => { authorization = new URL(url); },
    fetchImpl: async (url, options) => {
      exchanges++;
      assert.equal(url, authOrigin + '/auth/v1/token?grant_type=pkce');
      const body = JSON.parse(options.body);
      assert.equal(body.auth_code, 'fixture-code');
      assert.equal(crypto.createHash('sha256').update(body.code_verifier).digest('base64url'), authorization.searchParams.get('code_challenge'));
      return new Response(JSON.stringify(session), { status: 200 });
    },
  });
  const callback = new URL(authorization.searchParams.get('redirect_to'));
  assert.equal(callback.hostname, '127.0.0.1');
  try {
    const wrong = new URL('/wrong-nonce?code=fixture-code', callback);
    assert.equal((await fetch(wrong)).status, 404);
    assert.equal(exchanges, 0);
    callback.searchParams.set('code', 'fixture-code');
    assert.equal((await fetch(callback, { headers: { Origin: 'https://example.invalid' } })).status, 400);
    assert.equal(exchanges, 0);
    const response = await fetch(callback);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal(html.includes(session.access_token), false);
    assert.deepEqual(await attempt.result, session);
    assert.equal(exchanges, 1);
    await assert.rejects(fetch(callback));
  } finally { attempt.cancel(); }
});

test('failed token exchange rejects the return and closes the callback', async () => {
  let callback;
  const attempt = await startGoogleOAuth({
    authOrigin, publishableKey: 'public-fixture-key',
    openExternal: async url => { callback = new URL(new URL(url).searchParams.get('redirect_to')); },
    fetchImpl: async () => new Response('{}', { status: 400 }),
  });
  callback.searchParams.set('code', 'fixture-code');
  assert.equal((await fetch(callback)).status, 400);
  await assert.rejects(attempt.result, /oauth_exchange_failed/);
  await assert.rejects(fetch(callback));
});

test('each return changes the document and preserves existing app parameters', () => {
  const first = new URL(sessionReturnUrl('https://dai.invalid/app/?mode=desktop', session));
  const second = new URL(sessionReturnUrl('https://dai.invalid/app/?mode=desktop', session));
  assert.equal(first.searchParams.get('mode'), 'desktop');
  assert.notEqual(first.search, second.search);
  assert.equal(first.search.includes(session.access_token), false);
  assert.throws(() => sessionReturnUrl('https://dai.invalid/', { ...session, refresh_token: '' }), /invalid_session/);
});
