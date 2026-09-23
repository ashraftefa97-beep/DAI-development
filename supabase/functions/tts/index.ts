import { createClient } from 'npm:@supabase/supabase-js@2';

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

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

  const speechKey = String(Deno.env.get('AZURE_SPEECH_KEY') || '').trim();
  const speechRegion = String(Deno.env.get('AZURE_SPEECH_REGION') || '').trim();
  const speechEndpoint = String(Deno.env.get('AZURE_SPEECH_ENDPOINT') || '').trim();

  if (!speechKey || (!speechRegion && !speechEndpoint)) {
    return json({
      error: 'إعدادات Azure Speech ناقصة.',
      code: 'TTS_AZURE_CONFIG',
    }, 503);
  }

  const endpoint = speechEndpoint
    ? speechEndpoint.replace(/\/$/, '') + '/cognitiveservices/v1'
    : 'https://' + speechRegion + '.tts.speech.microsoft.com/cognitiveservices/v1';

  const voice = 'ar-EG-SalmaNeural';
  const ssml =
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar-EG">' +
    '<voice name="' + voice + '">' +
    '<prosody rate="+2%" pitch="+0Hz" volume="+0%">' + escapeXml(text) + '</prosody>' +
    '</voice></speak>';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'DAI-Voice',
      },
      body: ssml,
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 500);
      console.error('DAI Azure Speech failed', response.status, detail);

      if (response.status === 401 || response.status === 403) {
        return json({ error: 'تعذر توثيق خدمة الصوت.', code: 'TTS_AZURE_AUTH' }, 502);
      }
      if (response.status === 429) {
        return json({ error: 'خدمة الصوت وصلت لحد الاستخدام الحالي.', code: 'TTS_AZURE_QUOTA' }, 502);
      }

      return json({
        error: 'Azure Speech لم يرجع صوتًا.',
        code: 'TTS_AZURE_PROVIDER',
      }, 502);
    }

    const audio = new Uint8Array(await response.arrayBuffer());
    if (!audio.byteLength) {
      return json({ error: 'No audio returned', code: 'TTS_AZURE_EMPTY' }, 502);
    }

    return json({
      audioBase64: bytesToBase64(audio),
      mimeType: 'audio/mpeg',
      voice,
      provider: 'azure-speech',
    });
  } catch (error) {
    console.error('DAI Azure Speech network error', error);
    const code = error instanceof DOMException && error.name === 'AbortError'
      ? 'TTS_AZURE_TIMEOUT'
      : 'TTS_AZURE_NETWORK';

    return json({
      error: 'ضي مقدرتش تجهز الصوت دلوقتي.',
      code,
    }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
