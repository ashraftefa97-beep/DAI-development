import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateSpeech } from 'npm:@bestcodes/edge-tts@3.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ashraftefa97-beep.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
  const publicKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  if (!publicKey || !supabaseUrl) {
    return json({ error: 'Voice service unavailable', code: 'TTS_CONFIG' }, 503);
  }

  const supabase = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  const { data: rateAllowed, error: rateError } = await supabase.rpc('dai_rate_limit_hit', {
    p_limit: 24,
    p_window_seconds: 60,
  });
  if (rateError) {
    return json({ error: 'صوت ضي مشغول حاليًا.', code: 'TTS_RATE_CHECK' }, 503);
  }
  if (rateAllowed !== true) {
    return json({ error: 'طلبات صوت كتير بسرعة.', code: 'TTS_RATE_LIMIT' }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || '').replace(/\s+/g, ' ').trim();
  if (!text) return json({ error: 'Text is required' }, 400);
  if (text.length > 3200) {
    return json({ error: 'Text is too long for speech', code: 'TTS_TOO_LONG' }, 400);
  }

  const voice = 'ar-EG-SalmaNeural';

  try {
    const audio = await generateSpeech({
      text,
      voice,
      rate: '+2%',
      volume: '+0%',
      pitch: '+0Hz',
      connectTimeoutSeconds: 15,
      receiveTimeoutSeconds: 75,
    });

    const bytes = audio instanceof Uint8Array
      ? audio
      : new Uint8Array(audio as ArrayBufferLike);

    if (!bytes.byteLength) {
      return json({ error: 'No audio returned', code: 'TTS_EMPTY' }, 502);
    }

    return json({
      audioBase64: bytesToBase64(bytes),
      mimeType: 'audio/mpeg',
      voice,
      provider: 'microsoft-edge-neural',
    });
  } catch (error) {
    console.error('DAI Microsoft Salma TTS failed', error);
    return json({
      error: 'ضي مقدرتش تجهز الصوت دلوقتي.',
      code: 'TTS_EDGE_PROVIDER',
      detail: String((error as Error)?.message || error).slice(0, 300),
    }, 502);
  }
});
