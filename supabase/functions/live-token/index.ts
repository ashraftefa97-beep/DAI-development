const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  // This function is deployed with verify_jwt=true. Supabase validates the
  // caller's user JWT at the platform edge before this handler executes, so a
  // second auth.getUser() network round-trip only adds startup latency.
  const geminiApiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();

  if (!geminiApiKey) {
    return json({ error: 'Voice backend is not configured', code: 'VOICE_CONFIG' }, 503);
  }

  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1alpha/auth_tokens',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': geminiApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uses: 1,
          expireTime,
          newSessionExpireTime,
        }),
      },
    );

    const responseText = await response.text().catch(() => '');
    if (!response.ok) {
      console.error('Live token provider error', response.status, responseText.slice(0, 1000));
      return json({ error: 'Could not start DAI voice', code: 'VOICE_TOKEN' }, 502);
    }

    const payload = JSON.parse(responseText || '{}');
    const token = String(payload?.name || '').trim();
    if (!token) return json({ error: 'Voice token was empty', code: 'VOICE_TOKEN_EMPTY' }, 502);

    return json({
      token,
      model: 'gemini-3.8-live',
      expiresAt: expireTime,
      newSessionExpiresAt: newSessionExpireTime,
    });
  } catch (error) {
    console.error('Live token network error', error);
    return json({ error: 'Could not start DAI voice', code: 'VOICE_NETWORK' }, 502);
  }
});
