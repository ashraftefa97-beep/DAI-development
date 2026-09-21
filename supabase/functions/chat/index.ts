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
  const requestStartedAt = performance.now();
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
  const desktopActionResult = String(body?.desktopActionResult || '').trim().slice(0, 600);
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
        .order('created_at', { ascending: false })
        .limit(8);

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

  const userName = String(
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    ''
  ).trim().slice(0, 40);
  const userFirstName = userName.split(/\s+/).filter(Boolean)[0] || 'صاحب الحساب';

  const rawUserGender = String(user.user_metadata?.gender || '').trim().toLowerCase();
  const userGender = rawUserGender === 'male' || rawUserGender === 'female' ? rawUserGender : 'unspecified';
  const userGenderRule = userGender === 'male'
    ? 'المستخدم اختار إنه ذكر. خاطبيه بصيغة المذكر في العربية لما يكون السياق محتاج صيغة جنس.'
    : userGender === 'female'
      ? 'المستخدمة اختارت إنها أنثى. خاطبيها بصيغة المؤنث في العربية لما يكون السياق محتاج صيغة جنس.'
      : 'جنس المستخدم غير محدد. لا تفترضي جنسه واستخدمي صياغة محايدة قدر الإمكان.';

  const askedAboutAshrofi = /أشروفي|اشروفي/i.test(message);
  const currentUserIsAshraf = /^(أشرف|اشرف|ashraf)(?:\s|$)/i.test(userName);
  const nicknameRule = askedAboutAshrofi && currentUserIsAshraf
    ? 'المستخدم ذكر لقب «أشروفي» في رسالته الحالية، ومسموح لك تشرحي إنه لقب ودود لأشرف أو تستخدميه في هذا الرد فقط.'
    : 'ممنوع تستخدمي لقب «أشروفي» في هذا الرد.';

  const desktopRule = desktopActionResult
    ? `تطبيق ضي على الكمبيوتر نفّذ أمرًا محليًا بالفعل وكانت النتيجة: «${desktopActionResult}». اعترفي بالنتيجة باختصار وكأن ضي هي اللي نفذتها، ولا تقولي إنك لا تستطيعين التحكم في الكمبيوتر.`
    : 'لو المستخدم طلب تحكمًا محليًا في الكمبيوتر ولم تصلك نتيجة تنفيذ محلية، لا تدّعي إن الأمر اتنفذ.';

  const systemPrompt =
    `أنت ضي، مساعدة ذكية ودودة ومختصرة، وشخصيتك أنثوية. اسم المستخدم الأول هو «${userFirstName}». استخدمي الاسم الأول أحيانًا فقط لما يضيف ود أو وضوح، وما تستخدميش الاسم الكامل في الرد. ما تبدأيش كل رد بتحية أو باسم المستخدم. خلي أسلوبك بالمصري طبيعي ومرن ومتنوع، كحوار حقيقي مش خدمة عملاء. لو المستخدم قال «إزيك» أو سلّم عليكي، ردي بتحية قصيرة وطبيعية ومتنوعة بدل جملة محفوظة، ومتسأليش تلقائيًا «أقدر أساعدك بإيه النهارده؟» إلا لو السياق محتاج سؤال متابعة. تجنبي تكرار نفس افتتاحية الرد من رسالة للتانية. ${userGenderRule} ${nicknameRule} ${desktopRule} الرسائل المكتوبة يرد عليها التطبيق كتابة فقط، والمحادثة الصوتية فقط هي اللي يكون فيها رد صوتي. لو المستخدم سأل عن صوتك، قولي إن ضي بتتكلم بصوتها في المحادثة الصوتية. لا تذكري اسم مزود الذكاء أو تفاصيل تقنية إلا لو المستخدم سأل صراحة. لا تدّعي معلومات أو مصادر غير مؤكدة.`;

  const contents = [
    ...(historyRows || [])
      .slice()
      .reverse()
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

  const complexRequest =
    message.length > 900 ||
    /(?:كود|برمج|debug|حلل|تحليل|بالتفصيل|خطوة بخطوة|خطة كاملة|code|refactor|analy[sz]e|explain in detail)/i.test(message);
  const thinkingLevel = complexRequest ? 'low' : 'minimal';
  const maxOutputTokens = complexRequest ? 850 : 360;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let answer = '';
  let usedModel = '';
  let lastStatus = 0;
  let lastDetail = '';

  const aiStartedAt = performance.now();

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
              maxOutputTokens,
              thinkingConfig: {
                thinkingLevel,
              },
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

  const updatePromise = supabase
    .from('dai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  await updatePromise;

  return json({
    conversationId,
    userMessage,
    assistantMessage,
    provider: 'gemini',
    model: usedModel,
    performance: {
      aiMs: Math.round(performance.now() - aiStartedAt),
      totalMs: Math.round(performance.now() - requestStartedAt),
      thinkingLevel,
      historyMessages: (historyRows || []).length,
    },
  });
});
