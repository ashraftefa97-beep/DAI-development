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

  const credentials = btoa(clientId + ':' + secret);
  const response = await fetch(paypalBase() + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + credentials,
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
  if (!publicKey || !serviceRoleKey || !supabaseUrl) {
    return json({ error: 'Payment service unavailable', code: 'PAYMENT_CONFIG' }, 503);
  }

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const { data: entitlement } = await userClient
    .from('dai_entitlements')
    .select('plan,source,expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const entitlementExpired = Boolean(
    entitlement?.expires_at && new Date(entitlement.expires_at).getTime() <= Date.now()
  );
  if (entitlement?.plan === 'professional' && !entitlementExpired) {
    return json({
      alreadyProfessional: true,
      owner: entitlement.source === 'owner',
      message: entitlement.source === 'owner'
        ? 'Professional مفتوحة لنسخة المالك.'
        : 'Professional مفعلة بالفعل على الحساب.',
    });
  }

  const body = await req.json().catch(() => ({}));
  const billingPeriod = body?.billingPeriod === 'annual' ? 'annual' : 'monthly';
  const monthlyPlanId = (Deno.env.get('PAYPAL_MONTHLY_PLAN_ID') || '').trim();
  const annualPlanId = (Deno.env.get('PAYPAL_YEARLY_PLAN_ID') || '').trim();
  const planId = billingPeriod === 'annual' ? annualPlanId : monthlyPlanId;

  if (!planId) {
    return json({
      error: 'PayPal plan is not configured',
      code: 'PAYPAL_PLAN_CONFIG',
    }, 503);
  }

  let accessToken = '';
  try {
    accessToken = await paypalAccessToken();
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PAYPAL_AUTH';
    return json({
      error: code === 'PAYPAL_CONFIG'
        ? 'PayPal is not configured yet'
        : 'Could not connect to PayPal',
      code,
    }, 503);
  }

  const publicUrl = (Deno.env.get('DAI_PUBLIC_URL') || 'https://ashraftefa97-beep.github.io/DAI-development/').trim();
  const baseReturnUrl = publicUrl.endsWith('/') ? publicUrl : publicUrl + '/';

  const response = await fetch(paypalBase() + '/v1/billing/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
      'PayPal-Request-Id': crypto.randomUUID(),
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: user.id,
      application_context: {
        brand_name: 'DAI AI',
        user_action: 'SUBSCRIBE_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: baseReturnUrl + '?paypal=success',
        cancel_url: baseReturnUrl + '?paypal=cancelled',
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id) {
    console.error('DAI PayPal create subscription failed', {
      status: response.status,
      name: payload?.name,
    });
    return json({ error: 'تعذر بدء اشتراك PayPal حاليًا.', code: 'PAYPAL_CREATE' }, 502);
  }

  const subscriptionId = String(payload.id);
  const approvalUrl = Array.isArray(payload.links)
    ? String(payload.links.find((link: any) => link?.rel === 'approve')?.href || '')
    : '';

  if (!approvalUrl || !/^https:\/\/www\.paypal\.com\//i.test(approvalUrl) && !/^https:\/\/www\.sandbox\.paypal\.com\//i.test(approvalUrl)) {
    return json({ error: 'PayPal approval link is unavailable', code: 'PAYPAL_APPROVAL' }, 502);
  }

  const { error: saveError } = await admin
    .from('dai_paypal_subscriptions')
    .upsert({
      user_id: user.id,
      paypal_subscription_id: subscriptionId,
      paypal_plan_id: planId,
      billing_period: billingPeriod,
      status: String(payload.status || 'APPROVAL_PENDING'),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'paypal_subscription_id' });

  if (saveError) {
    console.error('DAI PayPal pending subscription save failed', saveError);
    return json({ error: 'تعذر حفظ حالة الاشتراك.', code: 'PAYPAL_SAVE' }, 500);
  }

  return json({
    subscriptionId,
    approvalUrl,
    billingPeriod,
  });
});
