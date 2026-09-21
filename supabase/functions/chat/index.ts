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
        .limit(24);

  const aiApiKey = (Deno.env.get('AI_API_KEY') || '').trim();
  const aiModel = (Deno.env.get('AI_MODEL') || 'gpt-4.1-mini').trim();
  const rawBaseUrl = (Deno.env.get('AI_BASE_URL') || 'https://api.openai.com/v1').trim();

  if (!aiApiKey) {
    return json({ error: 'AI backend is not configured yet', code: 'AI_CONFIG' }, 503);
  }

  let aiUrl = '';
  try {
    const parsed = new URL(rawBaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');

    const clean = rawBaseUrl.replace(/\\/+$/, '');
    if (/\\/chat\\/completions$/i.test(clean)) {
      aiUrl = clean;
    } else if (/\\/v1$/i.test(clean)) {
      aiUrl = `${clean}/chat/completions`;
    } else {
      aiUrl = `${clean}/v1/chat/completions`;
    }
  } catch {
    console.error('Invalid AI_BASE_URL');
    return json({ error: 'AI_BASE_URL is invalid', code: 'AI_BASE_URL' }, 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const providerBody = JSON.stringify({
    model: aiModel,
    messages: [
      {
        role: 'system',
        content: 'أنت ضي، مساعدة ذكية ودودة ومختصرة. جاوب بالعربية المصرية افتراضيًا إلا لو المستخدم طلب لغة أخرى. لا تدّعي معلومات أو مصادر غير مؤكدة.',
      },
      ...(historyRows || []).map((item: any) => ({
        role: item.role,
        content: item.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ],
    temperature: 0.6,
    stream: false,
  });

  let aiResponse: Response;
  try {
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      lastResponse = await fetch(aiUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${aiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: providerBody,
      });

      if (lastResponse.status !== 429 || attempt === 2) break;

      const retryAfterHeader = Number(lastResponse.headers.get('retry-after') || 0);
      const waitMs = retryAfterHeader > 0
        ? Math.min(retryAfterHeader * 1000, 5000)
        : 1200 * (attempt + 1);

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    aiResponse = lastResponse!;
  } catch (error) {
    console.error('AI provider network error', error);
    const code = error instanceof DOMException && error.name === 'AbortError'
      ? 'AI_TIMEOUT'
      : 'AI_NETWORK';
    return json({ error: 'Could not reach AI provider', code }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!aiResponse.ok) {
    const detail = await aiResponse.text().catch(() => '');
    console.error('AI provider error', aiResponse.status, detail.slice(0, 800));

    if (aiResponse.status === 401 || aiResponse.status === 403) {
      return json({ error: 'AI provider rejected the API key', code: 'AI_AUTH' }, 502);
    }
    if (aiResponse.status === 404) {
      return json({ error: 'AI endpoint or model was not found', code: 'AI_NOT_FOUND' }, 502);
    }
    if (aiResponse.status === 429) {
      return json({ error: 'AI provider rate limit reached', code: 'AI_RATE_LIMIT' }, 502);
    }
    return json({
      error: 'AI provider request failed',
      code: 'AI_PROVIDER',
      providerStatus: aiResponse.status,
    }, 502);
  }

  const aiJson = await aiResponse.json().catch(() => null);
  const answer = String(aiJson?.choices?.[0]?.message?.content || '').trim();
  if (!answer) {
    console.error('AI provider returned no assistant content');
    return json({ error: 'AI returned an empty response', code: 'AI_EMPTY' }, 502);
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
  });
});
