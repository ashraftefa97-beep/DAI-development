import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sse(event: string, data: unknown) {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

function audioFromPayload(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    const data = String(inline?.data || '');
    if (!data) continue;
    const mimeType = String(
      inline?.mimeType ||
      inline?.mime_type ||
      'audio/pcm;rate=24000'
    );
    const rateMatch = mimeType.match(/rate=(\d+)/i);
    const sampleRate = Math.max(
      8000,
      Math.min(96000, Number(rateMatch?.[1] || 24000)),
    );
    return { data, mimeType, sampleRate };
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
  if (!publicKey || !supabaseUrl) {
    return json({ error: 'Voice service unavailable', code: 'TTS_STREAM_CONFIG' }, 503);
  }

  const supabase = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  const { data: rateAllowed, error: rateError } = await supabase.rpc('dai_rate_limit_hit', {
    p_limit: 28,
    p_window_seconds: 60,
  });
  if (rateError) {
    return json({ error: 'صوت ضي مشغول حاليًا.', code: 'TTS_STREAM_RATE_CHECK' }, 503);
  }
  if (rateAllowed !== true) {
    return json({ error: 'طلبات صوت كتير بسرعة.', code: 'TTS_STREAM_RATE_LIMIT' }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || '').replace(/\s+/g, ' ').trim().slice(0, 2800);
  if (!text) return json({ error: 'Missing text' }, 400);

  const apiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();
  if (!apiKey) {
    return json({ error: 'Voice service unavailable', code: 'TTS_STREAM_CONFIG' }, 503);
  }

  const prompt =
    'اقرئي النص التالي فقط بالمصري الطبيعي، كمتكلمة واحدة أنثوية شابة، بصوت واضح وناعم وثابت من أول كلمة لآخر كلمة. ' +
    'خلي الطبقة متوسطة مائلة للارتفاع، والإيقاع طبيعي، وما تغيريش شخصية الصوت أو تنزلي الطبقة في آخر الجمل.\n\n' +
    text;

  const models = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75000);
  const abortFromClient = () => controller.abort();
  req.signal.addEventListener('abort', abortFromClient, { once: true });

  let provider: Response | null = null;
  let usedModel = '';
  let lastStatus = 0;
  let lastDetail = '';

  try {
    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt,
              }],
            }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Leda',
                  },
                },
              },
            },
          }),
        },
      );

      lastStatus = response.status;
      if (response.ok && response.body) {
        provider = response;
        usedModel = model;
        break;
      }

      lastDetail = (await response.text().catch(() => '')).slice(0, 1200);
      if (![404, 429, 500, 502, 503, 504].includes(response.status)) break;
    }
  } catch (error) {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', abortFromClient);
    console.error('DAI streaming TTS connection error', error);
    return json({ error: 'ضي مقدرتش تبدأ الصوت.', code: 'TTS_STREAM_NETWORK' }, 502);
  }

  if (!provider?.body) {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', abortFromClient);
    console.error('DAI streaming TTS provider error', lastStatus, lastDetail);

    if (lastStatus === 401 || lastStatus === 403) {
      return json({ error: 'خدمة صوت ضي غير متاحة حاليًا.', code: 'TTS_STREAM_AUTH' }, 502);
    }
    if (lastStatus === 404) {
      return json({ error: 'صوت ضي غير متاح حاليًا.', code: 'TTS_STREAM_MODEL' }, 502);
    }
    if (lastStatus === 429) {
      return json({ error: 'صوت ضي وصل لحد الاستخدام الحالي.', code: 'TTS_STREAM_QUOTA' }, 502);
    }
    return json({ error: 'ضي مقدرتش تبدأ الصوت.', code: 'TTS_STREAM_PROVIDER' }, 502);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(output) {
      const reader = provider!.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let sentAudio = false;
      let audioChunks = 0;
      let sampleRate = 24000;

      output.enqueue(sse('start', {
        sampleRate,
        format: 'pcm16le',
        voice: 'Leda',
        model: usedModel,
      }));

      const handleFrame = (frame: string) => {
        const dataLines = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());
        if (!dataLines.length) return;

        const raw = dataLines.join('\n');
        if (!raw || raw === '[DONE]') return;

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return;
        }

        const audio = audioFromPayload(payload);
        if (!audio?.data) return;

        sampleRate = audio.sampleRate || sampleRate;
        sentAudio = true;
        audioChunks++;
        output.enqueue(sse('audio', {
          data: audio.data,
          sampleRate,
          mimeType: audio.mimeType,
        }));
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() || '';

          for (const frame of frames) handleFrame(frame);
        }

        buffer += decoder.decode();
        if (buffer.trim()) handleFrame(buffer);

        output.enqueue(sse('done', {
          ok: sentAudio,
          chunks: audioChunks,
          sampleRate,
          voice: 'Leda',
          model: usedModel,
        }));
      } catch (error) {
        console.error('DAI streaming TTS read error', error);
        output.enqueue(sse('error', {
          code: error instanceof DOMException && error.name === 'AbortError'
            ? 'TTS_STREAM_TIMEOUT'
            : 'TTS_STREAM_READ',
        }));
      } finally {
        clearTimeout(timeout);
        req.signal.removeEventListener('abort', abortFromClient);
        try { reader.releaseLock(); } catch {}
        try { output.close(); } catch {}
      }
    },
    cancel() {
      controller.abort();
      clearTimeout(timeout);
      req.signal.removeEventListener('abort', abortFromClient);
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  });
});
