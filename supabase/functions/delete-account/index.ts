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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

  if (!publicKey || !serviceRoleKey || !supabaseUrl) {
    return json({ error: 'Account service unavailable' }, 503);
  }

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });

  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  if (String(body?.confirm || '') !== 'DELETE') {
    return json({ error: 'Confirmation required' }, 400);
  }

  // Remove user-owned app data first. RLS keeps this scoped to the authenticated user.
  const { error: messagesError } = await userClient
    .from('dai_messages')
    .delete()
    .eq('user_id', user.id);
  if (messagesError) return json({ error: 'Could not remove account data' }, 500);

  const { error: conversationsError } = await userClient
    .from('dai_conversations')
    .delete()
    .eq('user_id', user.id);
  if (conversationsError) return json({ error: 'Could not remove account data' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('DAI account deletion failed', deleteError);
    return json({ error: 'Could not delete account' }, 500);
  }

  return json({ deleted: true });
});
