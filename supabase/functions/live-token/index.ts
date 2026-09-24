import { createClient } from 'npm:@supabase/supabase-js@2';

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

  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
  const publicKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY');
  if (!publicKey) return json({ error: 'Supabase public key unavailable' }, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    publicKey,
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const geminiApiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();

  if (!geminiApiKey) {
    return json({ error: 'Voice backend is not configured', code: 'VOICE_CONFIG' }, 503);
  }

  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/auth_tokens',
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

    const userName = String(
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      ''
    ).trim().slice(0, 40);
    const rawUserGender = String(user.user_metadata?.gender || '').trim().toLowerCase();
    const userGender = rawUserGender === 'male' || rawUserGender === 'female'
      ? rawUserGender
      : 'unspecified';

    return json({
      token,
      model: 'gemini-3.8-live',
      userName,
      userGender,
      expiresAt: expireTime,
    });
  } catch (error) {
    console.error('Live token network error', error);
    return json({ error: 'Could not start DAI voice', code: 'VOICE_NETWORK' }, 502);
  }
});
