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

function searchTerms(value: string) {
  const stop = new Set([
    'عاوز','عايز','محتاج','ممكن','افضل','أفضل','احسن','أحسن','لينك','رابط','موقع',
    'ابحث','دور','دورلي','هات','هاتلي','وريني','بحث','السوق','find','search','best','link','website','the','and','for','with',
    'على','علي','من','في','عن','الى','إلى','ده','دا','دي','هو','هي','ايه','إيه'
  ]);

  const normalized = String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/برينتر|طابعه|طابعة|طابعات/gi, ' printer ')
    .replace(/ثري\s*دي|ثلاثي(?:ة)?\s*الأبعاد|ثلاثية\s*الابعاد/gi, ' 3d ')
    .replace(/لاب\s*توب|لابتوب/gi, ' laptop ')
    .replace(/موبايل|هاتف/gi, ' phone ')
    .replace(/سماعات?|هيدفون/gi, ' headphones ')
    .replace(/كارت\s*شاشه|كارت\s*شاشة/gi, ' gpu ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ');

  return [...new Set(
    normalized
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2 && !stop.has(term))
  )].slice(0, 12);
}

function sourceRelevance(query: string, source: SearchSource) {
  let score = 0;
  let matches = 0;
  const title = String(source.title || '').toLowerCase();
  const snippet = String(source.snippet || '').toLowerCase();
  let host = '';
  try { host = new URL(source.url).hostname.replace(/^www\./, '').toLowerCase(); } catch {}

  for (const term of searchTerms(query)) {
    let matched = false;
    if (title.includes(term)) { score += 3; matched = true; }
    if (snippet.includes(term)) { score += 1.2; matched = true; }
    if (host.includes(term)) { score += 2.5; matched = true; }
    if (matched) matches++;
  }

  if (matches > 0) {
    if (/\.(gov|edu)(\.|$)/i.test(host)) score += 3.5;
    if (/^(?:docs\.|developer\.|support\.|help\.)/i.test(host)) score += 2.2;
    if (/(?:official|رسمي|الرسمية|الرسمى)/i.test(title + ' ' + snippet)) score += 1.5;
    if (source.snippet) score += 0.8;

    const recommendationIntent = /(?:أفضل|افضل|أحسن|احسن|أنسب|انسب|رشح|recommend|best|review|مراجعة)/i.test(query);
    if (recommendationIntent && /(?:techradar\.com|tomshardware\.com|pcmag\.com|rtings\.com|all3dp\.com|nytimes\.com)/i.test(host)) {
      score += 2;
    }
  }

  if (/(?:يوتيوب|youtube|فيديو)/i.test(query) && /youtube\.com$/i.test(host)) {
    score += 4;
    matches++;
  }
  if (/(?:github|جيت هب)/i.test(query) && /github\.com$/i.test(host)) {
    score += 4;
    matches++;
  }

  const currentIntent = /(?:أحدث|احدث|آخر|اليوم|دلوقتي|حالي|latest|today|current|2026)/i.test(query);
  if (matches > 0 && currentIntent && /(?:2026|2025)/.test(title + ' ' + snippet)) score += 1.2;

  if (/(?:pinterest\.|quora\.|medium\.com$)/i.test(host)) score -= 0.8;
  if (/(?:login|signin|account)/i.test(title)) score -= 1.2;

  return { score, matches };
}

function rankSearchSources(query: string, sources: SearchSource[]) {
  const seen = new Set<string>();
  const terms = searchTerms(query);

  return sources
    .filter((source) => {
      if (!source?.url || seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .map((source, index) => {
      const relevance = sourceRelevance(query, source);
      return { source, index, ...relevance };
    })
    .filter((item) => {
      if (terms.length === 0) return true;
      const requiredMatches = terms.length >= 2 ? Math.min(2, terms.length) : 1;
      return item.matches >= requiredMatches && item.score >= 2.4;
    })
    .sort((a, b) => b.score - a.score || b.matches - a.matches || a.index - b.index)
    .map((item) => item.source)
    .slice(0, 8);
}

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

const SEARCH_TOTAL_BUDGET_MS = 26000;
const SEARCH_BACKOFF_MS = 3 * 60 * 1000;
const RESEARCH_CACHE_TTL_MS = 90 * 1000;
const researchCache = new Map<string, {
  at:number;
  answer:string;
  sources:SearchSource[];
  engine:string;
}>();
let groundingBackoffUntil = 0;
let synthesisBackoffUntil = 0;

async function timedFetch(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal,
) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort();

  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true });

  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(250, Math.floor(timeoutMs)),
  );

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

function searchTimeLeft(deadline: number) {
  return Math.max(0, deadline - Date.now());
}

function heuristicSearchQuery(query: string) {
  return String(query || '')
    .replace(/(?:^|\s)(?:دورلي|دوريلي|ابحثلي|ابحثيلي|هاتلي|رشحلي|عاوز|عايز|محتاج)(?:\s+على)?/gi, ' ')
    .replace(/(?:\s+في\s+السوق|\s+الموجود\s+في\s+السوق)/gi, ' ')
    .replace(/أفضل|افضل|أحسن|احسن|أنسب|انسب/gi, ' best ')
    .replace(/برينتر|طابعه|طابعة|طابعات/gi, ' printer ')
    .replace(/ثري\s*دي|ثلاثي(?:ة)?\s*الأبعاد|ثلاثية\s*الابعاد/gi, ' 3D ')
    .replace(/لاب\s*توب|لابتوب/gi, ' laptop ')
    .replace(/موبايل|هاتف/gi, ' phone ')
    .replace(/سماعات?|هيدفون/gi, ' headphones ')
    .replace(/كارت\s*شاشه|كارت\s*شاشة/gi, ' GPU ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

async function rewriteFallbackSearchQuery(
  apiKey: string,
  configuredModel: string,
  query: string,
  deadline: number,
  parentSignal?: AbortSignal,
) {
  const heuristic = heuristicSearchQuery(query);
  if (Date.now() < groundingBackoffUntil || Date.now() < synthesisBackoffUntil) {
    return heuristic || query;
  }

  const candidates = [
    'gemini-3.5-flash-lite',
    ...(configuredModel.startsWith('gemini-') ? [configuredModel] : []),
    'gemini-3.1-flash-lite',
  ].filter((model, index, all) => all.indexOf(model) === index);

  for (const model of candidates) {
    const timeLeft = searchTimeLeft(deadline);
    if (timeLeft < 700) break;
    try {
      const response = await timedFetch(
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
              parts: [{
                text:
                  'حوّل طلب المستخدم لعبارة بحث ويب قصيرة ودقيقة. حافظ على أسماء المنتجات والأرقام. ' +
                  'استخدم الإنجليزية للمصطلحات التقنية لو ده يحسن النتائج. اكتب عبارة البحث فقط من غير شرح أو علامات اقتباس. الطلب: ' +
                  query
              }]
            }],
            generationConfig: { maxOutputTokens: 80, temperature: 0.1 },
          }),
        },
        Math.min(2800, timeLeft),
        parentSignal,
      );
      if (!response.ok) continue;
      const payload = await response.json().catch(() => ({}));
      const rewritten = String(
        payload?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text || '')
          ?.join('') || ''
      )
        .replace(/[\r\n]+/g, ' ')
        .replace(/^["'“”]+|["'“”]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
      if (rewritten.length >= 3) return rewritten;
    } catch {}
  }

  return heuristic || query;
}

function buildFallbackQueries(originalQuery: string, rewrittenQuery: string) {
  const recommendation = /(?:أفضل|افضل|أحسن|احسن|أنسب|انسب|رشح|recommend|best|review|مراجعة)/i.test(originalQuery);
  const current = /(?:أحدث|احدث|آخر|اليوم|دلوقتي|حالي|latest|today|current|2026)/i.test(originalQuery);
  const base = String(rewrittenQuery || originalQuery).replace(/\s+/g, ' ').trim();
  const queries: string[] = [];

  const push = (value: string) => {
    const clean = value.replace(/\s+/g, ' ').trim().slice(0, 190);
    if (clean && !queries.some((item) => item.toLowerCase() === clean.toLowerCase())) queries.push(clean);
  };

  if (recommendation) {
    const hasBest = /\bbest\b/i.test(base);
    const hasYear = /\b20\d{2}\b/.test(base);
    push((hasBest ? base : 'best ' + base) + (hasYear ? '' : ' 2026') + ' review');
    push(base + ' comparison' + (hasYear ? '' : ' 2026'));
  }

  push(base);
  if (current && !/\b2026\b/.test(base)) push(base + ' 2026');

  const productTech = /(?:3d\s*printer|printer|laptop|phone|headphones|gpu|graphics card|camera|monitor)/i.test(base);
  if (recommendation && productTech) {
    push('site:tomshardware.com ' + base);
    push('site:techradar.com ' + base);
  }
  if (/(?:3d\s*printer|3d\s*printing)/i.test(base)) {
    push('site:all3dp.com ' + base);
  }

  return queries.slice(0, 5);
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

async function fallbackYoutubeSearch(query: string, timeoutMs = 5000, parentSignal?: AbortSignal) {
  const cleanQuery = query.replace(/(?:يوتيوب|youtube|فيديو)/ig, '').trim();
  const response = await timedFetch(
    'https://www.youtube.com/results?search_query=' + encodeURIComponent(cleanQuery || query),
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAI-Research/1.0)',
        'Accept-Language': 'ar,en;q=0.8',
      },
    },
    timeoutMs,
    parentSignal,
  );

  if (!response.ok) return [] as SearchSource[];
  const html = await response.text();
  const results: SearchSource[] = [];
  const seen = new Set<string>();
  const pattern = /"videoId":"([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) && results.length < 8) {
    const videoId = match[1];
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);

    const nearby = html.slice(Math.max(0, match.index - 650), match.index + 1200);
    const titleMatch = nearby.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
    const title = String(titleMatch?.[1] || 'فيديو يوتيوب')
      .replace(/\\u0026/g, '&')
      .replace(/\\n/g, ' ')
      .replace(/\\\"/g, '"')
      .trim()
      .slice(0, 180);

    results.push({
      title: title || 'فيديو يوتيوب',
      url: 'https://www.youtube.com/watch?v=' + videoId,
    });
  }

  return rankSearchSources(query, results);
}

async function fallbackWebSearch(query: string, deadline = Date.now() + 7500, parentSignal?: AbortSignal) {
  const youtubeOnly = /(?:يوتيوب|youtube|فيديو)/i.test(query);

  if (youtubeOnly) {
    try {
      const youtubeBudget = Math.min(4500, Math.max(900, searchTimeLeft(deadline) - 1200));
      const youtubeResults = await fallbackYoutubeSearch(query, youtubeBudget, parentSignal);
      if (youtubeResults.length) return youtubeResults;
    } catch {
      // Fall through to RSS search.
    }
  }
  const searchQuery = youtubeOnly
    ? 'site:youtube.com/watch ' + query.replace(/(?:يوتيوب|youtube)/ig, '').trim()
    : query;

  const rssBudget = searchTimeLeft(deadline);
  if (rssBudget < 500) return [] as SearchSource[];

  const response = await timedFetch(
    'https://www.bing.com/search?format=rss&q=' + encodeURIComponent(searchQuery),
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAI-Research/1.0)',
        'Accept': 'application/rss+xml,application/xml,text/xml,*/*',
      },
    },
    Math.min(5500, rssBudget),
    parentSignal,
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
    const descriptionMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
    const title = decodeHtml(titleMatch?.[1] || '').slice(0, 180);
    const url = decodeHtml(linkMatch?.[1] || '').trim();
    const snippet = decodeHtml(descriptionMatch?.[1] || '').slice(0, 320);

    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    if (youtubeOnly && !/youtube\.com\/watch/i.test(url)) continue;

    seen.add(url);
    results.push({
      title: title || 'نتيجة بحث',
      url,
      snippet: snippet || undefined,
    });
  }

  return rankSearchSources(query, results);
}

async function fallbackMultiSearch(
  originalQuery: string,
  rewrittenQuery: string,
  deadline: number,
  parentSignal?: AbortSignal,
) {
  const queries = buildFallbackQueries(originalQuery, rewrittenQuery);
  if (!queries.length) return [] as SearchSource[];

  const remaining = searchTimeLeft(deadline);
  if (remaining < 700) return [] as SearchSource[];

  const tasks = queries.map(async (searchQuery) => {
    try {
      return await fallbackWebSearch(
        searchQuery,
        deadline,
        parentSignal,
      );
    } catch {
      return [] as SearchSource[];
    }
  });

  const groups = await Promise.all(tasks);
  return rankSearchSources(
    originalQuery + ' ' + rewrittenQuery,
    groups.flat(),
  );
}

function fallbackAnswerFromSources(query: string, sources: SearchSource[]) {
  if (!sources.length) return '';
  const ranked = rankSearchSources(query, sources);
  const best = ranked[0];

  if (/(?:يوتيوب|youtube|فيديو)/i.test(query)) {
    return best
      ? 'أنسب نتيجة لطلبك عندي هي: ' + best.title + '\n' + best.url
      : 'لقيتلك نتائج مناسبة على يوتيوب، والمصادر موجودة تحت الرد.';
  }

  const recommendationIntent = /(?:أفضل|افضل|أحسن|احسن|أنسب|انسب|رشح|اختار|اختاري|recommend|best|which one)/i.test(query);
  const useful = ranked
    .slice(0, 3)
    .map((source, index) => {
      const detail = source.snippet ? ': ' + source.snippet : '';
      return `${index + 1}) ${source.title}${detail}`;
    })
    .join('\n');

  if (recommendationIntent && best && ranked.length >= 2) {
    return 'أنسب اختيار بعد مقارنة النتائج المرتبطة بطلبك هو: ' + best.title +
      (best.snippet ? '\n' + best.snippet : '') +
      '\n' + best.url +
      (useful ? '\n\nبدائل قوية:\n' + useful : '');
  }

  return useful
    ? 'لقيت النتائج الأقرب لطلبك:\n' + useful
    : 'لقيت نتائج مرتبطة بطلبك، والمصادر موجودة تحت الرد.';
}

async function synthesizeFromSources(
  apiKey: string,
  query: string,
  sources: SearchSource[],
  deadline = Date.now() + 7000,
  parentSignal?: AbortSignal,
) {
  if (!sources.length) return '';
  if (Date.now() < synthesisBackoffUntil) return '';

  const rankedSources = rankSearchSources(query, sources);
  const sourceText = rankedSources
    .slice(0, 6)
    .map((source, index) => `${index + 1}. ${source.title}\n${source.snippet || ''}\n${source.url}`)
    .join('\n\n');

  const prompt =
    'استخدم نتائج البحث التالية فقط كمصادر متاحة، وهي مرتبة مبدئيًا حسب الصلة وجودة المصدر. ' +
    'قارن النتائج قبل الرد وما تعتبرش أول نتيجة هي الأفضل تلقائيًا. ' +
    'للحقائق فضّل المصدر الأصلي أو الرسمي، وللمقارنات راعي المصادر المستقلة الموثوقة. ' +
    'لو الطلب عن فيديو أو رابط، اختَر الأكثر تطابقًا واذكر الرابط بوضوح. ' +
    'لو الطلب عن أفضل/أنسب/ترشيح في موضوع غير سياسي، اختَر اختيارًا واحدًا واضحًا واذكر سبب الاختيار ومعيارك باختصار. ' +
    'لو الموضوع سياسي أو انتخابي، ما تختارش فائز أو أفضل طرف وما تأيدش اختيار؛ اعرض مقارنة محايدة فقط. ' +
    'لو الطلب عن حل مشكلة، استنتج أقوى خطوات عملية بدون ادعاء تفاصيل غير موجودة. ' +
    'جاوب بالمصري الطبيعي. الطلب: ' + query + '\n\nنتائج البحث:\n' + sourceText;

  for (const model of ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']) {
    const timeLeft = searchTimeLeft(deadline);
    if (timeLeft < 600) break;
    try {
      const response = await timedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 420 },
          }),
        },
        Math.min(6000, timeLeft),
        parentSignal,
      );
      if (!response.ok) {
        if (response.status === 429) {
          synthesisBackoffUntil = Date.now() + SEARCH_BACKOFF_MS;
          break;
        }
        if ([400, 404, 503].includes(response.status)) continue;
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
      if (parentSignal?.aborted) break;
      // Try the next model while there is budget left.
    }
  }

  return '';
}

function researchCacheKey(query: string) {
  return String(query || '').toLowerCase().replace(/\s+/g,' ').trim().slice(0,500);
}

function getResearchCache(query: string) {
  const key=researchCacheKey(query);
  const cached=researchCache.get(key);
  if(!cached)return null;
  if(Date.now()-cached.at>RESEARCH_CACHE_TTL_MS){
    researchCache.delete(key);
    return null;
  }
  return cached;
}

function setResearchCache(query: string, answer: string, sources: SearchSource[], engine: string) {
  if(!answer)return;
  researchCache.set(researchCacheKey(query),{at:Date.now(),answer,sources,engine});
  if(researchCache.size>40){
    const oldest=[...researchCache.entries()]
      .sort((a,b)=>a[1].at-b[1].at)
      .slice(0,researchCache.size-40);
    for(const [key] of oldest)researchCache.delete(key);
  }
}

async function interactionGroundedSearch(
  apiKey:string,
  query:string,
  prompt:string,
  deadline:number,
  parentSignal?:AbortSignal,
){
  if(Date.now()<groundingBackoffUntil||searchTimeLeft(deadline)<1000)return null;

  try{
    const response=await timedFetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method:'POST',
        headers:{
          'x-goog-api-key':apiKey,
          'Content-Type':'application/json',
        },
        body:JSON.stringify({
          model:'gemini-3.8-flash',
          input:prompt,
          tools:[{type:'google_search'}],
          generation_config:{
            thinking_level:'low',
            max_output_tokens:640,
          },
        }),
      },
      Math.min(9000,searchTimeLeft(deadline)),
      parentSignal,
    );

    const responseText=await response.text().catch(()=> '');
    if(!response.ok){
      if(response.status===429)groundingBackoffUntil=Date.now()+SEARCH_BACKOFF_MS;
      return null;
    }

    const payload=JSON.parse(responseText||'{}');
    const answerParts:string[]=[];
    const sourceMap=new Map<string,SearchSource>();

    for(const step of payload?.steps||[]){
      if(step?.type!=='model_output')continue;
      for(const block of step?.content||[]){
        if(block?.type!=='text')continue;
        const text=String(block?.text||'').trim();
        if(text)answerParts.push(text);
        for(const annotation of block?.annotations||[]){
          if(annotation?.type!=='url_citation')continue;
          const url=String(annotation?.url||'').trim();
          if(!/^https?:\/\//i.test(url)||sourceMap.has(url))continue;
          sourceMap.set(url,{
            title:String(annotation?.title||'مصدر').trim().slice(0,180)||'مصدر',
            url,
          });
        }
      }
    }

    const answer=answerParts.join('\n').trim();
    const sources=[...sourceMap.values()].slice(0,8);
    const recommendation=/(?:أفضل|افضل|أحسن|احسن|أنسب|انسب|رشح|recommend|best|review|مراجعة)/i.test(query);
    if(!answer||(recommendation?sources.length<2:sources.length<1))return null;

    return {answer,sources};
  }catch{
    return null;
  }
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
    'gemini-3.5-flash-lite',
    ...(configuredModel.startsWith('gemini-') ? [configuredModel] : []),
    'gemini-3.1-flash-lite',
  ].filter((model, index, all) => all.indexOf(model) === index);

  const prompt =
    'ابحث على الويب عن الطلب التالي وقارن أكثر من نتيجة قبل ما تحكم. ' +
    'قيّم النتائج حسب مطابقة الطلب، موثوقية المصدر، المصدر الأصلي/الرسمي عند الحاجة، والحداثة لو السؤال حديث. ' +
    'لو المستخدم طالب حل مشكلة: لخص السبب الأقرب، ثم أقوى خطوات الحل بالترتيب. ' +
    'لو طالب رابط أو فيديو: اختَر الأكثر تطابقًا فعلًا ولا تختلق رابطًا. ' +
    'لو طالب أفضل/أنسب/ترشيح في موضوع غير سياسي، اختَر اختيارًا واضحًا مبنيًا على المعايير واذكر باختصار ليه هو الأنسب. ' +
    'لو الموضوع سياسي أو انتخابي، ممنوع تختار فائز أو أفضل طرف أو تدفع المستخدم لاختيار؛ اعرض مقارنة محايدة فقط. ' +
    'لا تذكر اسم مزود الذكاء أو تفاصيل تقنية عن أداة البحث. جاوب بالمصري الطبيعي. الطلب: ' + query;

  const cached=getResearchCache(query);
  if(cached){
    return json({
      ok:true,
      answer:cached.answer,
      sources:cached.sources,
      engine:cached.engine+':cache',
    });
  }

  const interactionDeadline=Date.now()+10000;
  const interaction=await interactionGroundedSearch(
    apiKey,
    query,
    prompt,
    interactionDeadline,
    req.signal,
  );
  if(interaction){
    setResearchCache(query,interaction.answer,interaction.sources,'interactions-google-search');
    return json({
      ok:true,
      answer:interaction.answer,
      sources:interaction.sources,
      engine:'interactions-google-search',
    });
  }

  let lastStatus = 0;
  const deadline = Date.now() + SEARCH_TOTAL_BUDGET_MS;
  const groundedDeadline = Math.min(deadline, Date.now() + 19000);

  for (const model of modelCandidates) {
    if (Date.now() < groundingBackoffUntil) break;
    const timeLeft = searchTimeLeft(groundedDeadline);
    if (timeLeft < 700) break;
    try {
      const response = await timedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
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
        Math.min(8000, timeLeft),
        req.signal,
      );
      lastStatus = response.status;
      const responseText = await response.text().catch(() => '');
      if (!response.ok) {
        if (response.status === 429) {
          groundingBackoffUntil = Date.now() + SEARCH_BACKOFF_MS;
          break;
        }
        if ([400, 404, 503].includes(response.status)) continue;
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
        const ranked=rankSearchSources(query,sources);
        const recommendation=/(?:أفضل|افضل|أحسن|احسن|أنسب|انسب|رشح|recommend|best|review|مراجعة)/i.test(query);
        if(!recommendation||ranked.length>=2){
          setResearchCache(query,answer,ranked,'grounded');
          return json({
            ok:true,
            answer,
            sources:ranked,
            engine:'grounded'
          });
        }
      }
      if (answer && !/(?:لينك|رابط|فيديو|مصدر|source|link|video)/i.test(query)) {
        return json({ ok: true, answer, sources: [], engine: 'grounded-no-links' });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('DAI web research failed', error);
      }
      if (req.signal.aborted) break;
    }
  }

  console.error('DAI web research grounding status', lastStatus);

  try {
    const fallbackDeadline = Math.min(deadline, Date.now() + 9000);
    const rewrittenQuery = await rewriteFallbackSearchQuery(
      apiKey,
      configuredModel,
      query,
      fallbackDeadline,
      req.signal,
    );
    const rankingQuery = query + ' ' + rewrittenQuery;
    let sources = await fallbackMultiSearch(
      query,
      rewrittenQuery,
      fallbackDeadline,
      req.signal,
    );

    if (!sources.length && rewrittenQuery.toLowerCase() !== query.toLowerCase() && searchTimeLeft(fallbackDeadline) > 1000) {
      sources = rankSearchSources(
        rankingQuery,
        await fallbackWebSearch(query, fallbackDeadline, req.signal),
      );
    }

    if (sources.length) {
      const synthesized = await synthesizeFromSources(apiKey, query, sources, deadline, req.signal);
      const answer = synthesized || fallbackAnswerFromSources(query, sources);
      const safeSources=sources.slice(0,6).map(({title,url})=>({title,url}));
      setResearchCache(query,answer,safeSources,'fallback-web');
      return json({
        ok:true,
        answer,
        sources:safeSources,
        engine:'fallback-web',
      });
    }
  } catch (error) {
    console.error('DAI fallback web search failed', error);
  }

  return json({ error: 'ضي مش قادرة تكمل البحث دلوقتي.' }, 502);
});
