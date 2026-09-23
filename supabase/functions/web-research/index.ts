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

function searchAllowed(text: string) {
  return !/(?:سلاح|أسلحة|مسدس|بندقي|ذخيرة|سكين|خنجر|صاعق|تيزر|pepper\s*spray|gun|firearm|ammo|knife|taser|مخدر|حشيش|ماريجوانا|كوكايين|هيروين|فودكا|ويسكي|كحول|alcohol|cannabis|marijuana|cocaine|heroin|قمار|مراهن|كازينو|betting|casino|gambling|تحدي خطير|dangerous challenge)/i.test(text);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
  const publicKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY');
  if (!publicKey) return json({ error: 'Service unavailable' }, 503);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    publicKey,
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

  const { data: rateAllowed, error: rateError } = await supabase.rpc('dai_rate_limit_hit', {
    p_limit: 10,
    p_window_seconds: 60,
  });
  if (rateError) return json({ error: 'البحث مشغول حاليًا.' }, 503);
  if (rateAllowed !== true) return json({ error: 'طلبات بحث كتير في وقت قصير.' }, 429);

  const body = await req.json().catch(() => ({}));
  const query = String(body?.query || '').trim().slice(0, 1200);
  if (!query) return json({ error: 'Search query is required' }, 400);

  if (!searchAllowed(query)) {
    return json({
      ok: false,
      blocked: true,
      answer: 'مش هقدر أبحث عن المحتوى ده، لكن أقدر أساعد بمعلومات سلامة عامة.',
      sources: [],
    }, 200);
  }

  const apiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();
  if (!apiKey) return json({ error: 'خدمة البحث غير متاحة حاليًا.' }, 503);

  const configuredModel = (Deno.env.get('AI_MODEL') || '').trim();
  const modelCandidates = [
    'gemini-3.8-flash',
    ...(configuredModel.startsWith('gemini-') ? [configuredModel] : []),
    'gemini-3.1-flash-lite',
  ].filter((model, index, all) => all.indexOf(model) === index);

  const prompt =
    'ابحث على الويب عن الطلب التالي ثم قدّم خلاصة عملية ومباشرة بالمصري الطبيعي. ' +
    'لو المستخدم طالب حل مشكلة: لخص السبب الأقرب، ثم خطوات الحل بالترتيب. ' +
    'لو طالب رابط أو فيديو: اختَر نتيجة مناسبة فعلًا ولا تختلق رابطًا. ' +
    'لا تذكر اسم مزود الذكاء أو تفاصيل تقنية عن أداة البحث. الطلب: ' + query;

  let lastStatus = 0;

  for (const model of modelCandidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: {
              maxOutputTokens: 500,
              thinkingConfig: { thinkingLevel: 'minimal' },
            },
          }),
        },
      );
      lastStatus = response.status;
      const responseText = await response.text().catch(() => '');
      if (!response.ok) {
        if ([400, 404, 429, 503].includes(response.status)) continue;
        break;
      }

      const payload = JSON.parse(responseText || '{}');
      const candidate = payload?.candidates?.[0];
      const answer = String(
        candidate?.content?.parts?.map((part: any) => part?.text || '').join('') || ''
      ).trim();

      const sources: Array<{title:string;url:string}> = [];
      const seen = new Set<string>();
      for (const chunk of candidate?.groundingMetadata?.groundingChunks || []) {
        const url = String(chunk?.web?.uri || '').trim();
        if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
        seen.add(url);
        sources.push({
          title: String(chunk?.web?.title || 'مصدر').trim().slice(0, 180) || 'مصدر',
          url,
        });
        if (sources.length >= 6) break;
      }

      if (answer) return json({ ok: true, answer, sources });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('DAI web research failed', error);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error('DAI web research provider status', lastStatus);
  return json({ error: 'ضي مش قادرة تكمل البحث دلوقتي.' }, 502);
});
