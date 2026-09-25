import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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

function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000) {
  const binary = atob(pcmBase64);
  const pcm = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcm[i] = binary.charCodeAt(i);

  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const channels = 1;
  const bitsPerSample = 16;
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

function findInlineAudio(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    if (inline?.data) return inline;
  }
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
  if (!publicKey || !supabaseUrl) return json({ error: 'Voice service unavailable', code: 'TTS_GEMINI_CONFIG' }, 503);

  const supabase = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  const { data: rateAllowed, error: rateError } = await supabase.rpc('dai_rate_limit_hit', {
    p_limit: 20,
    p_window_seconds: 60,
  });
  if (rateError) return json({ error: 'صوت ضي مشغول حاليًا.', code: 'TTS_GEMINI_RATE_CHECK' }, 503);
  if (rateAllowed !== true) return json({ error: 'طلبات صوت كتير بسرعة.', code: 'TTS_GEMINI_RATE_LIMIT' }, 429);

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || '').replace(/\s+/g, ' ').trim();
  const segmentIndex = Math.max(0, Math.min(8, Number(body?.segmentIndex || 0)));
  const segmentCount = Math.max(1, Math.min(8, Number(body?.segmentCount || 1)));
  const previousTail = String(body?.previousTail || '')
    .replace(/[\u0000-\u001F\u007F]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(-180);
  if (!text) return json({ error: 'Text is required' }, 400);
  if (text.length > 2800) return json({ error: 'Text is too long', code: 'TTS_GEMINI_TOO_LONG' }, 400);

  const apiKey = String(Deno.env.get('GEMINI_API_KEY') || Deno.env.get('AI_API_KEY') || '').trim();
  if (!apiKey) return json({ error: 'Voice service unavailable', code: 'TTS_GEMINI_CONFIG' }, 503);

  const voiceName = 'Leda';
  const continuationRule = segmentCount > 1
    ? (
        segmentIndex === 0
          ? 'ده أول جزء من رد متصل. حافظي على طبقة صوت ثابتة وما تنزليش النبرة في آخر الجزء كأنه نهاية الرد؛ خليه ينتهي طبيعي كأنه هيكمل فورًا. '
          : 'ده تكملة مباشرة لنفس الرد ونفس المتكلمة. ابدئي بنفس طبقة الصوت والخامة والسرعة من الجزء السابق من غير reset أو تغليظ للصوت. ' +
            (previousTail ? 'السياق السابق للتناسق فقط، وما تقريهوش: «' + previousTail + '». ' : '')
      )
    : '';

  const prompt =
    'اقرئي النص التالي فقط باللهجة المصرية الطبيعية كأنك بتتكلمي مع شخص قدامك، مش بتقري نص محفوظ. خلي الأداء إنساني ودافي وواثق بصوت أنثوي شاب وواضح. ' +
    'قسمي الجمل لمجموعات تنفّس قصيرة من 4 لـ10 كلمات، وسيبي وقفات خفيفة عند الفاصلة وبعد الفكرة المكتملة. غيّري الإيقاع والتأكيد بدرجة بسيطة حسب المعنى، وركزي على الكلمة المهمة بدل ما تعلي الجملة كلها. ' +
    'من غير نبرة مذيع أو روبوت، ومن غير رتابة أو مبالغة تمثيلية. حافظي على نفس الخامة والهوية الصوتية، وما تسرعيش أو تغلظي آخر الجملة. ' +
    continuationRule +
    '\n\nالنص المطلوب قراءته فقط:\n' +
    text;

  const models = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
  let lastStatus = 0;
  let lastDetail = '';

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                languageCode: 'ar-XA',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          }),
        },
      );

      lastStatus = response.status;
      const responseText = await response.text().catch(() => '');
      lastDetail = responseText.slice(0, 1000);

      if (!response.ok) {
        if ([404, 429, 500, 502, 503, 504].includes(response.status)) continue;
        break;
      }

      const payload = JSON.parse(responseText || '{}');
      const inline = findInlineAudio(payload);
      const pcmBase64 = String(inline?.data || '');
      const mimeType = String(inline?.mimeType || inline?.mime_type || 'audio/pcm;rate=24000');
      const rateMatch = mimeType.match(/rate=(\d+)/i);
      const sampleRate = Math.max(8000, Math.min(96000, Number(rateMatch?.[1] || 24000)));

      if (!pcmBase64) {
        lastDetail = 'Gemini response contained no inline audio';
        continue;
      }

      return json({
        audioBase64: pcmBase64ToWavBase64(pcmBase64, sampleRate),
        mimeType: 'audio/wav',
        voice: voiceName,
        model,
        provider: 'gemini',
        sampleRate,
        pcmBytes: Math.floor(atob(pcmBase64).length),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastStatus = 408;
        lastDetail = 'Gemini TTS timed out';
      } else {
        lastStatus = 0;
        lastDetail = String(error);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error('DAI Gemini TTS failed', lastStatus, lastDetail);
  if (lastStatus === 401 || lastStatus === 403) return json({ error: 'Gemini auth failed', code: 'TTS_GEMINI_AUTH' }, 502);
  if (lastStatus === 404) return json({ error: 'Gemini TTS model unavailable', code: 'TTS_GEMINI_MODEL' }, 502);
  if (lastStatus === 429) return json({ error: 'Gemini TTS quota reached', code: 'TTS_GEMINI_QUOTA' }, 502);
  if (lastStatus === 408) return json({ error: 'Gemini TTS timeout', code: 'TTS_GEMINI_TIMEOUT' }, 502);
  return json({ error: 'Gemini TTS failed', code: 'TTS_GEMINI_PROVIDER' }, 502);
});
