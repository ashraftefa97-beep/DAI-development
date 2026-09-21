import { createClient } from 'npm:@supabase/supabase-js@2';
import { ANIMATION_CATALOG } from './catalog.ts';

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

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[_\-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const allowlist = new Set(ANIMATION_CATALOG.map(item => item.id));
const byId = new Map(ANIMATION_CATALOG.map(item => [item.id, item]));

const aliases: Array<[string,string]> = [
  ['هاي فايف','dai_high_five'], ['high five','dai_high_five'],
  ['ارقصي','dai_dance'], ['رقصي','dai_dance'], ['رقصه','dai_dance'], ['dance','dai_dance'],
  ['صقفي','dai_clap'], ['تصفيق','dai_clap'], ['clap','dai_clap'],
  ['اضحكي','dai_laugh'], ['ضحك','dai_laugh'], ['laugh','dai_laugh'],
  ['ضحكه صغيره','dai_giggle'], ['giggle','dai_giggle'],
  ['لوحي','dai_wave'], ['تحيه','dai_wave'], ['wave','dai_wave'],
  ['مع السلامه','dai_goodbye'], ['goodbye','dai_goodbye'],
  ['انحني','dai_bow'], ['انحناء','dai_bow'], ['bow','dai_bow'],
  ['تحيه عسكريه','dai_salute'], ['salute','dai_salute'],
  ['علامه السلام','dai_peace'], ['peace','dai_peace'],
  ['انتصار','dai_victory'], ['victory','dai_victory'],
  ['قلب','dai_heart'], ['heart','dai_heart'],
  ['احتفال','dai_celebrate'], ['celebrate','dai_celebrate'],
  ['حفله','dai_party'], ['party','dai_party'],
  ['لفي','dai_spin'], ['لفه','dai_spin'], ['spin','dai_spin'],
  ['نطي شمال','dai_hop_left'], ['hop left','dai_hop_left'],
  ['نطي يمين','dai_hop_right'], ['hop right','dai_hop_right'],
  ['تمدد','dai_stretch'], ['stretch','dai_stretch'],
  ['تثاؤب','dai_yawn'], ['yawn','dai_yawn'],
  ['تأمل','dai_meditate'], ['meditate','dai_meditate'],
  ['تنفس','dai_breathe'], ['breathe','dai_breathe'],
  ['فكره','dai_idea'], ['idea','dai_idea'],
  ['لمبه فكره','dai_lightbulb_pop'], ['lightbulb','dai_lightbulb_pop'],
  ['بصه فضول','dai_peek'], ['peek','dai_peek'],
  ['بصي حواليكي','dai_look_around'], ['look around','dai_look_around'],
  ['فخوره','dai_proud'], ['proud','dai_proud'],
  ['متحمسه','dai_excited'], ['excited','dai_excited'],
  ['محتاره','dai_confused'], ['confused','dai_confused'],
  ['تفكير عميق','dai_thinking_deep'], ['think deeply','dai_thinking_deep'],
  ['سؤال','dai_question'], ['question','dai_question'],
  ['تشجيع','dai_cheer'], ['cheer','dai_cheer'],
  ['قراءه','dai_read'], ['read','dai_read'],
  ['كتابه سريعه','dai_type_fast'], ['type fast','dai_type_fast'],
  ['تركيز كود','dai_code_focus'], ['code focus','dai_code_focus'],
  ['عصف ذهني','dai_brainstorm'], ['brainstorm','dai_brainstorm'],
  ['مسح بصري','dai_scan'], ['scan','dai_scan'],
  ['اكتشاف','dai_detect'], ['detect','dai_detect'],
  ['تحميل','dai_loading'], ['loading','dai_loading'],
  ['مشي بهدوء','dai_sneak'], ['sneak','dai_sneak'],
  ['وقفه نجمه','dai_pose_star'], ['star pose','dai_pose_star'],
  ['بوز للكاميرا','dai_camera_pose'], ['camera pose','dai_camera_pose'],
];

function directAnimation(text: string) {
  const normalized = normalize(text);
  const commandLike = /(?:اعملي|اعمل|وريني|وريلي|اتحركي|حركه|حركة|ارقصي|صقفي|اضحكي|لوحي|نطي|لفي|مثلي|اعمليلي|do|show|play|animate)/i.test(text);
  if (!commandLike) return '';

  for (const [alias, id] of aliases) {
    if (normalized.includes(normalize(alias))) return id;
  }

  const sorted = [...ANIMATION_CATALOG].sort((a,b) => normalize(b.labelAr).length - normalize(a.labelAr).length);
  for (const item of sorted) {
    const label = normalize(item.labelAr);
    const gesture = normalize(item.gesture);
    const idText = normalize(item.id.replace(/^dai_/, ''));
    if ((label && normalized.includes(label)) || (gesture && normalized.includes(gesture)) || (idText && normalized.includes(idText))) {
      return item.id;
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
  const publicKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const url = Deno.env.get('SUPABASE_URL') || '';
  if (!publicKey || !url) return json({ error: 'Service unavailable' }, 503);

  const supabase = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
  });

  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const { data: entitlement } = await supabase
    .from('dai_entitlements')
    .select('plan,expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const expired = Boolean(entitlement?.expires_at && new Date(entitlement.expires_at).getTime() <= Date.now());
  const professional = entitlement?.plan === 'professional' && !expired;
  if (!professional) {
    return json({ animation: null, reason: 'professional_required', professional: false }, 403);
  }

  const { data: rateAllowed } = await supabase.rpc('dai_rate_limit_hit', {
    p_limit: 24,
    p_window_seconds: 60,
  });
  if (rateAllowed !== true) return json({ animation: null, reason: 'rate_limited' }, 429);

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === 'request' ? 'request' : 'auto';
  const userText = String(body?.userText || '').trim().slice(0, 1200);
  const assistantText = String(body?.assistantText || '').trim().slice(0, 1800);

  if (!userText && !assistantText) return json({ animation: null, reason: 'empty' }, 400);

  const direct = directAnimation(userText);
  if (direct && allowlist.has(direct)) {
    return json({ animation: direct, reason: 'explicit_request', explicit: true, professional: true });
  }

  if (mode === 'request') {
    // Ambiguous explicit requests can be resolved semantically below.
  } else {
    const serious = /(?:وفاه|مات|موت|حادث|مرض|مستشفى|دكتور|طوارئ|قانون|محكمه|اعتداء|خطر|نزيف|انتحار|ايذاء النفس|suicide|self harm|hospital|emergency|legal)/i.test(userText + ' ' + assistantText);
    if (serious) return json({ animation: null, reason: 'serious_context', professional: true });
  }

  const apiKey = (Deno.env.get('GEMINI_API_KEY') || Deno.env.get('AI_API_KEY') || '').trim();
  if (!apiKey) return json({ animation: null, reason: 'selector_unavailable', professional: true });

  const catalogText = ANIMATION_CATALOG
    .map(item => `${item.id} = ${item.labelAr} [${item.category}]`)
    .join('\n');

  const prompt = mode === 'request'
    ? `المستخدم طلب من شخصية ضي حركة. اختار أقرب حركة من القائمة فقط. لو الطلب لا يطلب حركة فعلية اكتب none.
طلب المستخدم: ${userText}
الحركات:
${catalogText}
اكتب ID واحد فقط أو none.`
    : `أنت مدير تعبيرات شخصية ضي. اختار حركة واحدة فقط لو هتضيف تعبيرًا طبيعيًا للرد، وإلا اكتب none.
قواعد مهمة:
- غالبًا اختار none؛ الحركة التلقائية لازم تكون خفيفة ومش مع كل رد.
- اختار الحركة بناءً على معنى الرد والموقف، مش كلمات سطحية فقط.
- ما تختارش حركات احتفالية في سياق جاد أو حساس.
- لا تختار talk/listen/loading/working لمجرد وجود رد عادي.
- الرد النهائي لازم يكون ID من القائمة أو none فقط.
رسالة المستخدم: ${userText}
رد ضي: ${assistantText}
الحركات:
${catalogText}`;

  const models = ['gemini-3.5-flash-lite','gemini-3.1-flash-lite'];
  let selected = '';
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
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 24,
              thinkingConfig: { thinkingLevel: 'minimal' },
              temperature: 0.1,
            },
          }),
        },
      );
      if (!response.ok) {
        if ([404,429,503].includes(response.status)) continue;
        break;
      }
      const payload = await response.json().catch(() => ({}));
      const raw = String(payload?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join('') || '').trim();
      const candidate = raw.match(/dai_[a-z0-9_]+/i)?.[0]?.toLowerCase() || '';
      if (candidate && allowlist.has(candidate)) selected = candidate;
      break;
    } catch {
      continue;
    }
  }

  if (!selected) return json({ animation: null, reason: 'none', professional: true });

  const item = byId.get(selected);
  return json({
    animation: selected,
    reason: mode === 'request' ? 'semantic_request' : 'context_choice',
    explicit: mode === 'request',
    professional: true,
    category: item?.category || null,
  });
});
