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

  const { data: row, error } = await supabase
    .from('dai_entitlements')
    .select('plan,source,expires_at,updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return json({ error: 'Could not read plan' }, 500);

  const expired = Boolean(row?.expires_at && new Date(row.expires_at).getTime() <= Date.now());
  const professional = row?.plan === 'professional' && !expired;
  const plan = professional ? 'professional' : 'standard';

  const features = professional
    ? [
        'desktop.apps.open',
        'desktop.apps.focus',
        'desktop.apps.close',
        'desktop.media',
        'desktop.shortcuts',
        'desktop.links',
        'desktop.files.open',
        'desktop.startup',
        'desktop.runningApps.read',
      ]
    : [];

  return json({
    plan,
    source: professional ? String(row?.source || 'subscription') : 'standard',
    owner: professional && row?.source === 'owner',
    expiresAt: professional ? row?.expires_at || null : null,
    features,
  });
});
