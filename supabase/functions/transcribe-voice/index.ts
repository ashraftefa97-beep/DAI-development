import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ashraftefa97-beep.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

const allowedAudio = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/aac',
  'audio/x-m4a',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/wav',
  'audio/x-wav',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
  const publicKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  if (!publicKey || !supabaseUrl) return json({ error: 'Voice service unavailable' }, 503);

  const supabase = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });

  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  const { data: rateAllowed, error: rateError } = await supabase.rpc('dai_rate_limit_hit', {
    p_limit: 12,
    p_window_seconds: 60,
  });
  if (rateError) return json({ error: 'ضي مشغولة بالصوت حاليًا. جرّب بعد لحظة.', code: 'VOICE_RATE_CHECK' }, 503);
  if (rateAllowed !== true) return json({ error: 'طلبات صوت كتير بسرعة. استنى شوية وجرب تاني.', code: 'VOICE_RATE_LIMIT' }, 429);

  const body = await req.json().catch(() => ({}));
  const audioBase64 = String(body?.audioBase64 || '').trim();
  let mimeType = String(body?.mimeType || '').trim().toLowerCase();

  if (!audioBase64 || audioBase64.length > 9_000_000) {
    return json({ error: 'التسجيل فاضي أو كبير زيادة.', code: 'VOICE_AUDIO_SIZE' }, 400);
  }

  // Browsers sometimes append codec parameters with spacing/case.
  mimeType = mimeType.replace(/\s+/g, '');
  if (!allowedAudio.has(mimeType)) {
    if (mimeType.startsWith('audio/webm')) mimeType = 'audio/webm';
    else if (mimeType.startsWith('audio/ogg')) mimeType = 'audio/ogg';
    else if (mimeType.startsWith('audio/mp4')) mimeType = 'audio/mp4';
  }
  if (!allowedAudio.has(mimeType)) {
    return json({ error: 'صيغة التسجيل مش مدعومة.', code: 'VOICE_AUDIO_FORMAT' }, 415);
  }

  const apiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();
  if (!apiKey) return json({ error: 'خدمة فهم الصوت غير متاحة حاليًا.', code: 'VOICE_CONFIG' }, 503);

  const models = [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
  ];

  const instruction =
    'حوّل التسجيل الصوتي إلى نص فقط. حافظ على لغة المتحدث ولهجته قدر الإمكان، خصوصًا العربية المصرية. ' +
    'اكتب الكلمات اللي اتقالت فقط بدون مقدمة، بدون شرح، وبدون علامات اقتباس. ' +
    'لو التسجيل غير مفهوم تمامًا، اكتب أقرب نص واضح ولا تخترع كلامًا غير مسموع.';

  let lastStatus = 0;
  let lastDetail = '';

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: instruction },
                { inlineData: { mimeType, data: audioBase64 } },
              ],
            }],
            generationConfig: {
              maxOutputTokens: 700,
              thinkingConfig: { thinkingLevel: 'minimal' },
            },
          }),
        },
      );

      lastStatus = response.status;
      const responseText = await response.text().catch(() => '');
      lastDetail = responseText.slice(0, 1200);

      if (response.ok) {
        const payload = JSON.parse(responseText || '{}');
        const transcript = String(
          payload?.candidates?.[0]?.content?.parts
            ?.map((part: any) => part?.text || '')
            ?.join('') || ''
        ).trim();

        if (transcript) {
          return json({ transcript: transcript.slice(0, 8000) });
        }
      }

      if (![404, 429, 503].includes(response.status)) break;
    } catch (error) {
      console.error('DAI voice transcription network error', error);
    }
  }

  console.error('DAI voice transcription failed', lastStatus, lastDetail);
  return json({
    error: lastStatus === 429
      ? 'ضي عليها ضغط في تحويل الصوت. جرّب تاني بعد شوية.'
      : 'ضي مقدرتش تفهم التسجيل ده. جرّب تسجله تاني.',
    code: lastStatus === 429 ? 'VOICE_QUOTA' : 'VOICE_TRANSCRIBE',
  }, 502);
});
