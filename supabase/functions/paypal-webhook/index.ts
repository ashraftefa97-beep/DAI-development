import { createClient } from 'npm:@supabase/supabase-js@2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

function uuidLike(value: unknown) {
  const text = String(value || '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : '';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const webhookId = (Deno.env.get('PAYPAL_WEBHOOK_ID') || '').trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  if (!webhookId || !serviceRoleKey || !supabaseUrl) {
    return json({ error: 'Webhook not configured' }, 503);
  }

  const rawBody = await req.text();
  let event: any;
  try { event = JSON.parse(rawBody); } catch { return json({ error: 'Invalid JSON' }, 400); }

  let accessToken = '';
  try { accessToken = await paypalAccessToken(); }
  catch { return json({ error: 'PayPal verification unavailable' }, 503); }

  const verificationResponse = await fetch(
    paypalBase() + '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: req.headers.get('paypal-transmission-id') || '',
        transmission_time: req.headers.get('paypal-transmission-time') || '',
        cert_url: req.headers.get('paypal-cert-url') || '',
        auth_algo: req.headers.get('paypal-auth-algo') || '',
        transmission_sig: req.headers.get('paypal-transmission-sig') || '',
        webhook_id: webhookId,
        webhook_event: event,
      }),
    }
  );

  const verification = await verificationResponse.json().catch(() => ({}));
  if (!verificationResponse.ok || verification?.verification_status !== 'SUCCESS') {
    console.warn('DAI rejected unverified PayPal webhook');
    return json({ error: 'Invalid webhook signature' }, 400);
  }

  const eventType = String(event?.event_type || '');
  if (!eventType.startsWith('BILLING.SUBSCRIPTION.')) {
    return json({ received: true, ignored: true });
  }

  const subscriptionId = String(event?.resource?.id || '');
  if (!subscriptionId) return json({ received: true, ignored: true });

  const detailResponse = await fetch(
    paypalBase() + '/v1/billing/subscriptions/' + encodeURIComponent(subscriptionId),
    {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  );
  const details = await detailResponse.json().catch(() => ({}));
  if (!detailResponse.ok) return json({ error: 'Could not verify subscription' }, 502);

  const userId = uuidLike(details?.custom_id);
  const planId = String(details?.plan_id || '');
  const monthlyPlanId = (Deno.env.get('PAYPAL_MONTHLY_PLAN_ID') || '').trim();
  const annualPlanId = (Deno.env.get('PAYPAL_YEARLY_PLAN_ID') || '').trim();
  const billingPeriod = planId === annualPlanId
    ? 'annual'
    : planId === monthlyPlanId
      ? 'monthly'
      : '';

  if (!userId || !billingPeriod) {
    console.warn('DAI ignored PayPal subscription with unknown account/plan');
    return json({ received: true, ignored: true });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const status = String(details?.status || event?.resource?.status || 'UNKNOWN').toUpperCase();
  await admin
    .from('dai_paypal_subscriptions')
    .upsert({
      user_id: userId,
      paypal_subscription_id: subscriptionId,
      paypal_plan_id: planId,
      billing_period: billingPeriod,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'paypal_subscription_id' });

  if (status === 'ACTIVE') {
    const { data: existing } = await admin
      .from('dai_entitlements')
      .select('source')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.source !== 'owner') {
      await admin
        .from('dai_entitlements')
        .upsert({
          user_id: userId,
          plan: 'professional',
          source: 'subscription',
          expires_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }
  } else if (['CANCELLED','SUSPENDED','EXPIRED'].includes(status)) {
    const { data: activeRows } = await admin
      .from('dai_paypal_subscriptions')
      .select('paypal_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .neq('paypal_subscription_id', subscriptionId)
      .limit(1);

    if (!activeRows?.length) {
      const { data: existing } = await admin
        .from('dai_entitlements')
        .select('source')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing?.source === 'subscription') {
        await admin.from('dai_entitlements').delete().eq('user_id', userId);
      }
    }
  }

  return json({ received: true });
});
