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
  const publicKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY');
  if (!publicKey) return json({ error: 'Supabase public key is unavailable' }, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    publicKey,
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const message = String(body?.message || '').trim();
  let conversationId = String(body?.conversationId || '').trim();

  if (!message || message.length > 8000) {
    return json({ error: 'Message is required and must be under 8000 characters' }, 400);
  }

  const needsConversation = !conversationId;

  if (!needsConversation) {
    const { data: owned } = await supabase
      .from('dai_conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (!owned) return json({ error: 'Conversation not found' }, 404);
  }

  const { data: historyRows } = needsConversation
    ? { data: [] as Array<{ role: string; content: string; created_at: string }> }
    : await supabase
        .from('dai_messages')
        .select('role,content,created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(12);

  const geminiApiKey = (
    Deno.env.get('GEMINI_API_KEY') ||
    Deno.env.get('AI_API_KEY') ||
    ''
  ).trim();

  const configuredModel = (Deno.env.get('AI_MODEL') || '').trim();
  const modelCandidates = [
    'gemini-3.5-flash-lite',
    ...(configuredModel.startsWith('gemini-') ? [configuredModel] : []),
    'gemini-3.1-flash-lite',
  ].filter((model, index, all) => all.indexOf(model) === index);

  if (!geminiApiKey) {
    return json({ error: 'Gemini API key is not configured', code: 'GEMINI_CONFIG' }, 503);
  }

  const systemPrompt =
    'أنت ضي، مساعدة ذكية ودودة ومختصرة، وشخصيتك أنثوية. المستخدم الأساسي اسمه أشرف، وهو شخص قريب جدًا ومميز عند ضي، وممكن تناديه أحيانًا «يا أشروفي» كلقب ودود لطيف من غير مبالغة أو تكرار. جاوبي بالعربية المصرية افتراضيًا إلا لو المستخدم طلب لغة أخرى. واجهة ضي فيها تشغيل صوتي أنثوي يقرأ ردودك تلقائيًا، لذلك لا تقولي أبدًا إنك لا تستطيعين الكلام أو إنك مجرد دردشة كتابية. لو المستخدم سأل عن صوتك، قولي إن صوت ضي شغال من التطبيق ويمكن تشغيله أو إيقافه من الإعدادات. لا تتكلمي عن تفاصيل تقنية إلا لو المستخدم سأل. لا تدّعي معلومات أو مصادر غير مؤكدة.';

  const contents = [
    ...(historyRows || [])
      .filter((item: any) => item.role === 'user' || item.role === 'assistant')
      .map((item: any) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(item.content || '') }],
      })),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let answer = '';
  let usedModel = '';
  let lastStatus = 0;
  let lastDetail = '';

  try {
    for (const model of modelCandidates) {
      const aiUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      let response: Response | null = null;

      for (let attempt = 0; attempt < 1; attempt++) {
        response = await fetch(aiUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': geminiApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: 0.55,
              maxOutputTokens: 500,
            },
          }),
        });

        if (response.status !== 429 || attempt === 0) break;

        const retryAfterHeader = Number(response.headers.get('retry-after') || 0);
        const waitMs = retryAfterHeader > 0
          ? Math.min(retryAfterHeader * 1000, 4000)
          : 1200;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      if (!response) continue;

      lastStatus = response.status;
      const responseText = await response.text().catch(() => '');
      lastDetail = responseText.slice(0, 1200);

      if (response.ok) {
        const payload = JSON.parse(responseText || '{}');
        answer = String(
          payload?.candidates?.[0]?.content?.parts
            ?.map((part: any) => part?.text || '')
            ?.join('') || ''
        ).trim();

        if (answer) {
          usedModel = model;
          break;
        }

        lastStatus = 502;
        lastDetail = 'Gemini returned an empty response';
      }

      // Try another free Gemini model when the requested model is unavailable
      // or its free quota is temporarily exhausted.
      if (response.status === 404 || response.status === 429 || response.status === 503) {
        continue;
      }

      break;
    }
  } catch (error) {
    console.error('Gemini network error', error);
    const code = error instanceof DOMException && error.name === 'AbortError'
      ? 'GEMINI_TIMEOUT'
      : 'GEMINI_NETWORK';
    return json({ error: 'Could not reach Gemini', code }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!answer) {
    console.error('Gemini provider error', lastStatus, lastDetail);

    const lowered = lastDetail.toLowerCase();

    if (lastStatus === 400) {
      return json({ error: 'Gemini rejected the request', code: 'GEMINI_BAD_REQUEST' }, 502);
    }

    if (lastStatus === 401 || lastStatus === 403) {
      return json({ error: 'Gemini rejected the API key or project access', code: 'GEMINI_AUTH' }, 502);
    }

    if (lastStatus === 429) {
      const quotaCode =
        lowered.includes('resource_exhausted') ||
        lowered.includes('quota') ||
        lowered.includes('rate');
      return json({
        error: quotaCode ? 'Gemini free quota is exhausted' : 'Gemini is busy',
        code: quotaCode ? 'GEMINI_QUOTA' : 'GEMINI_RATE_LIMIT',
      }, 502);
    }

    if (lastStatus === 404) {
      return json({ error: 'No configured Gemini model is available', code: 'GEMINI_MODEL' }, 502);
    }

    if (lastStatus === 503) {
      return json({ error: 'Gemini is temporarily overloaded', code: 'GEMINI_OVERLOADED' }, 502);
    }

    return json({
      error: 'Gemini request failed',
      code: 'GEMINI_PROVIDER',
      providerStatus: lastStatus,
    }, 502);
  }

  if (needsConversation) {
    const { data: created, error } = await supabase
      .from('dai_conversations')
      .insert({
        user_id: user.id,
        title: message.slice(0, 48) || 'محادثة جديدة',
      })
      .select('id')
      .single();

    if (error || !created) return json({ error: 'Could not create conversation' }, 500);
    conversationId = created.id;
  }

  const { data: savedMessages, error: saveError } = await supabase
    .from('dai_messages')
    .insert([
      {
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: message,
      },
      {
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: answer,
      },
    ])
    .select('id,role,content,created_at');

  if (saveError || !savedMessages || savedMessages.length < 2) {
    return json({ error: 'Could not save conversation messages' }, 500);
  }

  const userMessage = savedMessages.find((item: any) => item.role === 'user');
  const assistantMessage = savedMessages.find((item: any) => item.role === 'assistant');
  if (!userMessage || !assistantMessage) {
    return json({ error: 'Could not read saved conversation messages' }, 500);
  }

  await supabase
    .from('dai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return json({
    conversationId,
    userMessage,
    assistantMessage,
    provider: 'gemini',
    model: usedModel,
  });
});
