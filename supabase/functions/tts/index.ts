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

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
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

function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const binary = atob(pcmBase64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);

  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);

  return bytesToBase64(wav);
}

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
    p_limit: 18,
    p_window_seconds: 60,
  });
  if (rateError) return json({ error: 'صوت ضي مشغول حاليًا. جرّب بعد لحظة.', code: 'TTS_RATE_CHECK' }, 503);
  if (rateAllowed !== true) return json({ error: 'طلبات صوت كتير بسرعة. استنى شوية وجرب تاني.', code: 'TTS_RATE_LIMIT' }, 429);

  const geminiApiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();

  if (!geminiApiKey) return json({ error: 'خدمة صوت ضي غير متاحة حاليًا.', code: 'TTS_CONFIG' }, 503);

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || '').trim();

  if (!text) return json({ error: 'Text is required' }, 400);
  if (text.length > 2800) return json({ error: 'Text is too long for speech', code: 'TTS_TOO_LONG' }, 400);

  const modelCandidates = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
  ];
  const voiceName = 'Aoede';
  const prompt =
    `اقرئي النص التالي فقط بصوت أنثوي دافئ وطبيعي، باللهجة المصرية، بسرعة محادثة مريحة ومن غير مبالغة أو نبرة روبوتية:\n\n${text}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    let lastStatus = 0;
    let lastDetail = '';

    for (const model of modelCandidates) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': geminiApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName,
                  },
                },
              },
            },
          }),
        },
      );

      lastStatus = response.status;
      const responseText = await response.text().catch(() => '');
      lastDetail = responseText.slice(0, 1200);

      if (response.ok) {
        const payload = JSON.parse(responseText || '{}');
        const part = payload?.candidates?.[0]?.content?.parts?.find((item: any) => item?.inlineData?.data);
        const pcmBase64 = String(part?.inlineData?.data || '');
        const providerMime = String(part?.inlineData?.mimeType || part?.inlineData?.mime_type || 'audio/pcm;rate=24000');
        const sampleRateMatch = providerMime.match(/rate=(\d+)/i);
        const sampleRate = Math.max(8000, Math.min(96000, Number(sampleRateMatch?.[1] || 24000)));

        if (pcmBase64) {
          const wavBase64 = pcmBase64ToWavBase64(pcmBase64, sampleRate);
          return json({
            audioBase64: wavBase64,
            mimeType: 'audio/wav',
            voice: voiceName,
            model,
            sampleRate,
          });
        }
      }

      if (![404, 429, 503].includes(response.status)) break;
    }

    console.error('DAI TTS provider error', lastStatus, lastDetail);
    if (lastStatus === 401 || lastStatus === 403) {
      return json({ error: 'خدمة صوت ضي غير متاحة حاليًا.', code: 'TTS_AUTH' }, 502);
    }
    if (lastStatus === 404) {
      return json({ error: 'صوت ضي غير متاح حاليًا.', code: 'TTS_MODEL' }, 502);
    }
    if (lastStatus === 429) {
      return json({ error: 'صوت ضي وصل لحد الاستخدام الحالي.', code: 'TTS_QUOTA' }, 502);
    }
    return json({ error: 'ضي واجهت مشكلة أثناء تجهيز الصوت.', code: 'TTS_PROVIDER' }, 502);
  } catch (error) {
    console.error('DAI TTS network error', error);
    const code = error instanceof DOMException && error.name === 'AbortError'
      ? 'TTS_TIMEOUT'
      : 'TTS_NETWORK';
    return json({ error: 'ضي واجهت مشكلة أثناء تجهيز الصوت.', code }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
