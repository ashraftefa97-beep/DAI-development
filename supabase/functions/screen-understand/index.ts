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

  const { data: entitlement, error: entitlementError } = await supabase
    .from('dai_entitlements')
    .select('plan,expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (entitlementError) return json({ error: 'Could not verify plan' }, 500);
  const expired = Boolean(
    entitlement?.expires_at && new Date(entitlement.expires_at).getTime() <= Date.now()
  );
  if (entitlement?.plan !== 'professional' || expired) {
    return json({ error: 'Professional required', code: 'PRO_REQUIRED' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const imageDataUrl = String(body?.imageDataUrl || '').trim();
  if (!/^data:image\/(?:jpeg|png);base64,/i.test(imageDataUrl)) {
    return json({ error: 'Invalid screenshot', code: 'SCREEN_INVALID' }, 400);
  }
  if (imageDataUrl.length > 2_800_000) {
    return json({ error: 'Screenshot is too large', code: 'SCREEN_TOO_LARGE' }, 413);
  }

  const match = imageDataUrl.match(/^data:image\/(jpeg|png);base64,(.+)$/i);
  if (!match) return json({ error: 'Invalid screenshot', code: 'SCREEN_INVALID' }, 400);
  const mimeType = match[1].toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
  const imageBase64 = match[2];

  const apiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();
  if (!apiKey) return json({ error: 'خدمة ضي الذكية غير متاحة حاليًا.', code: 'AI_CONFIG' }, 503);

  const configuredModel = (Deno.env.get('AI_MODEL') || '').trim();
  const modelCandidates = [
    'gemini-3.5-flash-lite',
    ...(configuredModel.startsWith('gemini-') ? [configuredModel] : []),
    'gemini-3.1-flash-lite',
  ].filter((model, index, all) => all.indexOf(model) === index);

  const prompt =
    'حللي لقطة الشاشة الحالية التي اختار المستخدم مشاركتها يدويًا مع ضي. ' +
    'قولي بالمصري في 2 إلى 5 جمل إيه التطبيق أو المحتوى الظاهر، وإيه المساعدة العملية اللي ممكن تتعمل دلوقتي. ' +
    'ما تنقليش كلمات مرور أو رموز تحقق أو بيانات حساسة حرفيًا حتى لو ظهرت في الصورة، واكتفي بوصف عام. ' +
    'ما تدعيش إنك بتراقبي الشاشة؛ دي لقطة واحدة فقط.';

  let lastStatus = 0;
  for (const model of modelCandidates) {
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
              { text: prompt },
              { inlineData: { mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 240,
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        }),
      }
    );

    lastStatus = response.status;
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      const summary = String(
        payload?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text || '')
          ?.join('') || ''
      ).trim();
      if (summary) return json({ summary });
    }

    if (![404, 429, 503].includes(response.status)) break;
  }

  return json({
    error: lastStatus === 429
      ? 'ضي عليها ضغط مؤقتًا. جرّب تاني.'
      : 'ضي مقدرتش تحلل الشاشة دلوقتي.',
    code: 'SCREEN_AI_FAILED',
  }, 502);
});
