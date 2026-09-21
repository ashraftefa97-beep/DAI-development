import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ashraftefa97-beep.github.io',
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
    p_limit: 28,
    p_window_seconds: 60,
  });
  if (rateError) return json({ error: 'صوت ضي مشغول حاليًا.', code: 'TTS_STREAM_RATE_CHECK' }, 503);
  if (rateAllowed !== true) return json({ error: 'طلبات صوت كتير بسرعة.', code: 'TTS_STREAM_RATE_LIMIT' }, 429);

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!text) return json({ error: 'Missing text' }, 400);

  const apiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();
  if (!apiKey) return json({ error: 'Voice service unavailable', code: 'TTS_STREAM_CONFIG' }, 503);

  const prompt =
    'اقرئي بالمصري الطبيعي، بصوت أنثوي دافئ، النص فقط من غير أي إضافة:\n' + text;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  const abortFromClient = () => controller.abort();
  req.signal.addEventListener('abort', abortFromClient, { once: true });

  let provider: Response;
  try {
    provider = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify({
        model: 'gemini-3.1-flash-tts-preview',
        input: prompt,
        response_format: {
          type: 'audio',
        },
        generation_config: {
          speech_config: [{ voice: 'Aoede' }],
        },
        stream: true,
        store: false,
      }),
    });
  } catch (error) {
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', abortFromClient);
    console.error('DAI streaming TTS connection error', error);
    return json({ error: 'ضي مقدرتش تبدأ الصوت.', code: 'TTS_STREAM_NETWORK' }, 502);
  }

  if (!provider.ok || !provider.body) {
    const detail = await provider.text().catch(() => '');
    clearTimeout(timeout);
    req.signal.removeEventListener('abort', abortFromClient);
    console.error('DAI streaming TTS provider error', provider.status, detail.slice(0, 1000));
    return json({ error: 'ضي مقدرتش تبدأ الصوت.', code: 'TTS_STREAM_PROVIDER' }, 502);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(output) {
      const reader = provider.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let sentAudio = false;
      let audioChunks = 0;

      output.enqueue(sse('start', { sampleRate: 24000, format: 'pcm16le' }));

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() || '';

          for (const frame of frames) {
            const dataLines = frame
              .split(/\r?\n/)
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim());
            if (!dataLines.length) continue;

            let payload: any;
            try { payload = JSON.parse(dataLines.join('\n')); } catch { continue; }

            if (
              payload?.event_type === 'step.delta' &&
              payload?.delta?.type === 'audio' &&
              payload?.delta?.data
            ) {
              sentAudio = true;
              audioChunks++;
              output.enqueue(sse('audio', {
                data: String(payload.delta.data),
                sampleRate: 24000,
              }));
            }
          }
        }

        output.enqueue(sse('done', { ok: sentAudio, chunks: audioChunks }));
      } catch (error) {
        console.error('DAI streaming TTS read error', error);
        output.enqueue(sse('error', { code: 'TTS_STREAM_READ' }));
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
