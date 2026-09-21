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

function paypalBase() {
  return (Deno.env.get('PAYPAL_MODE') || 'sandbox').toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function paypalAccessToken() {
  const clientId = (Deno.env.get('PAYPAL_CLIENT_ID') || '').trim();
  const secret = (Deno.env.get('PAYPAL_CLIENT_SECRET') || '').trim();
  if (!clientId || !secret) throw new Error('PAYPAL_CONFIG');

  const response = await fetch(paypalBase() + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(clientId + ':' + secret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) throw new Error('PAYPAL_AUTH');
  return String(payload.access_token);
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
  if (!publicKey || !serviceRoleKey || !supabaseUrl) return json({ error: 'Service unavailable' }, 503);

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: paymentConfig, error: paymentConfigError } = await admin
    .from('dai_payment_config')
    .select('mode,monthly_plan_id,annual_plan_id')
    .eq('provider', 'paypal')
    .maybeSingle();

  if (paymentConfigError || !paymentConfig) {
    return json({ error: 'PayPal plan is not configured', code: 'PAYPAL_PLAN_CONFIG' }, 503);
  }

  const configuredMode = String(paymentConfig.mode || 'sandbox').toLowerCase();
  const runtimeMode = (Deno.env.get('PAYPAL_MODE') || 'sandbox').toLowerCase();
  if (configuredMode !== runtimeMode) {
    return json({ error: 'PayPal environment mismatch', code: 'PAYPAL_ENV_MISMATCH' }, 503);
  }

  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const { data: latest } = await admin
    .from('dai_paypal_subscriptions')
    .select('paypal_subscription_id,paypal_plan_id,billing_period,status')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest?.paypal_subscription_id) {
    return json({ synced: true, plan: 'standard', subscription: null });
  }

  let accessToken = '';
  try { accessToken = await paypalAccessToken(); }
  catch { return json({ error: 'PayPal is not configured', code: 'PAYPAL_CONFIG' }, 503); }

  const response = await fetch(
    paypalBase() + '/v1/billing/subscriptions/' + encodeURIComponent(latest.paypal_subscription_id),
    {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  );
  const details = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: 'تعذر التحقق من الاشتراك مع PayPal.' }, 502);

  if (String(details?.custom_id || '') !== user.id) {
    return json({ error: 'Subscription ownership mismatch' }, 403);
  }

  const status = String(details?.status || 'UNKNOWN').toUpperCase();
  const planId = String(details?.plan_id || '');
  const monthlyPlanId = String(paymentConfig.monthly_plan_id || '');
  const annualPlanId = String(paymentConfig.annual_plan_id || '');
  const billingPeriod = planId === annualPlanId
    ? 'annual'
    : planId === monthlyPlanId
      ? 'monthly'
      : latest.billing_period;

  await admin
    .from('dai_paypal_subscriptions')
    .update({
      paypal_plan_id: planId || latest.paypal_plan_id,
      billing_period: billingPeriod,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', latest.paypal_subscription_id)
    .eq('user_id', user.id);

  const { data: currentEntitlement } = await admin
    .from('dai_entitlements')
    .select('source')
    .eq('user_id', user.id)
    .maybeSingle();

  if (status === 'ACTIVE' && currentEntitlement?.source !== 'owner') {
    await admin
      .from('dai_entitlements')
      .upsert({
        user_id: user.id,
        plan: 'professional',
        source: 'subscription',
        expires_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } else if (['CANCELLED','SUSPENDED','EXPIRED'].includes(status) && currentEntitlement?.source === 'subscription') {
    await admin.from('dai_entitlements').delete().eq('user_id', user.id);
  }

  return json({
    synced: true,
    status,
    plan: status === 'ACTIVE' || currentEntitlement?.source === 'owner'
      ? 'professional'
      : 'standard',
    billingPeriod,
  });
});
