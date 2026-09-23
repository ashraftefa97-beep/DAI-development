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
  return !/(?:سلاح|أسلحة|مسدس|بندقي|ذخيرة|سكين|خنجر|صاعق|تيزر|pepper\s*spray|gun|firearm|ammo|knife|taser|مخدر|حشيش|ماريجوانا|كوكايين|هيروين|فودكا|ويسكي|كحول|alcohol|cannabis|marijuana|cocaine|heroin|قمار|مراهن|كازينو|betting|casino|gambling|تحدي خطير|dangerous challenge|إباحي|اباحي|porn|xxx)/i.test(text);
}

type SearchSource = { title: string; url: string; snippet?: string };

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function unwrapSearchUrl(value: string) {
  try {
    const raw = value.startsWith('//') ? 'https:' + value : value;
    const url = new URL(raw, 'https://duckduckgo.com');
    const wrapped = url.searchParams.get('uddg');
    return wrapped ? decodeURIComponent(wrapped) : url.toString();
  } catch {
    return '';
  }
}

async function fallbackWebSearch(query: string) {
  const youtubeOnly = /(?:يوتيوب|youtube|فيديو)/i.test(query);
  const searchQuery = youtubeOnly
    ? 'site:youtube.com/watch ' + query.replace(/(?:يوتيوب|youtube)/ig, '').trim()
    : query;

  const response = await fetch(
    'https://www.bing.com/search?format=rss&q=' + encodeURIComponent(searchQuery),
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAI-Research/1.0)',
        'Accept': 'application/rss+xml,application/xml,text/xml,*/*',
      },
    },
  );

  if (!response.ok) return [] as SearchSource[];

  const xml = await response.text();
  const results: SearchSource[] = [];
  const seen = new Set<string>();
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemPattern.exec(xml)) && results.length < 8) {
    const block = itemMatch[1];
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const title = decodeHtml(titleMatch?.[1] || '').slice(0, 180);
    const url = decodeHtml(linkMatch?.[1] || '').trim();

    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    if (youtubeOnly && !/youtube\.com\/watch/i.test(url)) continue;

    seen.add(url);
    results.push({
      title: title || 'نتيجة بحث',
      url,
    });
  }

  return results;
}

async function synthesizeFromSources(
  apiKey: string,
  query: string,
  sources: SearchSource[],
) {
  if (!sources.length) return '';
  const sourceText = sources
    .slice(0, 6)
    .map((source, index) => `${index + 1}. ${source.title}\n${source.url}`)
    .join('\n\n');

  const prompt =
    'استخدم نتائج البحث التالية فقط كمصادر متاحة، وقدّم إجابة عملية ومباشرة بالمصري الطبيعي. ' +
    'لو الطلب عن فيديو أو رابط، اختَر أفضل نتيجة مناسبة من القائمة واذكر الرابط بوضوح. ' +
    'لو الطلب عن حل مشكلة، استنتج خطوات عملية بدون ادعاء تفاصيل غير موجودة. ' +
    'الطلب: ' + query + '\n\nنتائج البحث:\n' + sourceText;

  for (const model of ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 16000);
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
            generationConfig: { maxOutputTokens: 420 },
          }),
        },
      );
      if (!response.ok) {
        if ([400, 404, 429, 503].includes(response.status)) continue;
        break;
      }
      const payload = await response.json().catch(() => ({}));
      const answer = String(
        payload?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text || '')
          ?.join('') || ''
      ).trim();
      if (answer) return answer;
    } catch {
      // Try the next model.
    } finally {
      clearTimeout(timeout);
    }
  }

  return '';
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
    'gemini-3.5-flash-lite',
    ...(configuredModel.startsWith('gemini-') ? [configuredModel] : []),
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
  ].filter((model, index, all) => all.indexOf(model) === index);

  const prompt =
    'ابحث على الويب عن الطلب التالي ثم قدّم خلاصة عملية ومباشرة بالمصري الطبيعي. ' +
    'لو المستخدم طالب حل مشكلة: لخص السبب الأقرب، ثم خطوات الحل بالترتيب. ' +
    'لو طالب رابط أو فيديو: اختَر نتيجة مناسبة فعلًا ولا تختلق رابطًا. ' +
    'لا تذكر اسم مزود الذكاء أو تفاصيل تقنية عن أداة البحث. الطلب: ' + query;

  let lastStatus = 0;

  for (const model of modelCandidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 24000);
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
              maxOutputTokens: 520,
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

      if (answer && sources.length) {
        return json({ ok: true, answer, sources, engine: 'grounded' });
      }
      if (answer && !/(?:لينك|رابط|فيديو|مصدر|source|link|video)/i.test(query)) {
        return json({ ok: true, answer, sources: [], engine: 'grounded-no-links' });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('DAI web research failed', error);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error('DAI web research grounding status', lastStatus);

  try {
    const sources = await fallbackWebSearch(query);
    if (sources.length) {
      const synthesized = await synthesizeFromSources(apiKey, query, sources);
      const answer = synthesized || (
        /(?:يوتيوب|youtube|فيديو)/i.test(query)
          ? 'لقيتلك نتائج مناسبة على يوتيوب. افتح المصادر واختار الفيديو الأنسب.'
          : 'لقيت نتائج مرتبطة بطلبك. المصادر موجودة تحت الرد.'
      );
      return json({
        ok: true,
        answer,
        sources: sources.slice(0, 6).map(({ title, url }) => ({ title, url })),
        engine: 'fallback-web',
      });
    }
  } catch (error) {
    console.error('DAI fallback web search failed', error);
  }

  return json({ error: 'ضي مش قادرة تكمل البحث دلوقتي.' }, 502);
});
