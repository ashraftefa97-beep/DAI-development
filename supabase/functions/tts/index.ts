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

function pcmBase64ToWavBase64(
  pcmBase64: string,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
) {
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

function findAudioContent(payload: any) {
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex--) {
    const step = steps[stepIndex];
    const content = Array.isArray(step?.content) ? step.content : [];
    for (let contentIndex = content.length - 1; contentIndex >= 0; contentIndex--) {
      const item = content[contentIndex];
      if (item?.type === 'audio' && item?.data) return item;
    }
  }

  const direct = payload?.output_audio || payload?.outputAudio;
  if (direct?.data) return {
    type: 'audio',
    data: direct.data,
    mime_type: direct.mime_type || direct.mimeType || 'audio/wav',
    sample_rate: direct.sample_rate || direct.sampleRate || 24000,
    channels: direct.channels || 1,
  };

  return null;
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
    p_limit: 18,
    p_window_seconds: 60,
  });
  if (rateError) {
    return json({ error: 'صوت ضي مشغول حاليًا. جرّب بعد لحظة.', code: 'TTS_RATE_CHECK' }, 503);
  }
  if (rateAllowed !== true) {
    return json({ error: 'طلبات صوت كتير بسرعة. استنى شوية وجرب تاني.', code: 'TTS_RATE_LIMIT' }, 429);
  }

  const apiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();
  if (!apiKey) {
    return json({ error: 'خدمة صوت ضي غير متاحة حاليًا.', code: 'TTS_CONFIG' }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || '').replace(/\s+/g, ' ').trim();
  if (!text) return json({ error: 'Text is required' }, 400);
  if (text.length > 2800) {
    return json({ error: 'Text is too long for speech', code: 'TTS_TOO_LONG' }, 400);
  }

  const voiceName = 'Leda';
  const prompt =
    'اقرئي النص التالي فقط بالمصري الطبيعي، كمتكلمة واحدة أنثوية شابة، بصوت واضح وناعم وثابت من أول كلمة لآخر كلمة. ' +
    'خلي الطبقة متوسطة مائلة للارتفاع، والإيقاع طبيعي، وما تغيريش شخصية الصوت أو تنزلي الطبقة في آخر الجمل.\n\n' +
    text;

  const models = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
  ];

  let lastStatus = 0;
  let lastDetail = '';

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/interactions',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
            'Api-Revision': '2026-05-20',
          },
          body: JSON.stringify({
            model,
            input: prompt,
            response_format: {
              type: 'audio',
              mime_type: 'audio/wav',
              delivery: 'inline',
              sample_rate: 24000,
            },
            generation_config: {
              speech_config: [
                { voice: voiceName },
              ],
            },
            store: false,
          }),
        },
      );

      lastStatus = response.status;
      const responseText = await response.text().catch(() => '');
      lastDetail = responseText.slice(0, 1600);

      if (!response.ok) {
        if ([404, 429, 500, 502, 503, 504].includes(response.status)) continue;
        break;
      }

      const payload = JSON.parse(responseText || '{}');
      const audio = findAudioContent(payload);
      const audioBase64 = String(audio?.data || '');
      const mimeType = String(audio?.mime_type || audio?.mimeType || 'audio/wav').toLowerCase();
      const sampleRate = Math.max(
        8000,
        Math.min(96000, Number(audio?.sample_rate || audio?.sampleRate || 24000)),
      );
      const channels = Math.max(1, Math.min(2, Number(audio?.channels || 1)));

      if (!audioBase64) {
        lastStatus = 200;
        lastDetail = 'Interaction completed without inline audio content';
        continue;
      }

      if (mimeType.includes('wav')) {
        return json({
          audioBase64,
          mimeType: 'audio/wav',
          voice: voiceName,
          model,
          sampleRate,
        });
      }

      if (mimeType.includes('l16') || mimeType.includes('pcm')) {
        return json({
          audioBase64: pcmBase64ToWavBase64(audioBase64, sampleRate, channels),
          mimeType: 'audio/wav',
          voice: voiceName,
          model,
          sampleRate,
        });
      }

      return json({
        audioBase64,
        mimeType,
        voice: voiceName,
        model,
        sampleRate,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastStatus = 408;
        lastDetail = 'TTS request timed out';
        continue;
      }
      lastStatus = 0;
      lastDetail = String(error);
    } finally {
      clearTimeout(timeout);
    }
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
  if (lastStatus === 408) {
    return json({ error: 'صوت ضي اتأخر في التجهيز.', code: 'TTS_TIMEOUT' }, 502);
  }

  return json({
    error: 'ضي واجهت مشكلة أثناء تجهيز الصوت.',
    code: 'TTS_PROVIDER',
  }, 502);
});
