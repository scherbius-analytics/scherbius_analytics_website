/**
 * cancel-subscription — Supabase Edge Function (Deno)
 *
 * Deployment:
 *   supabase functions deploy cancel-subscription
 *
 * Handles two cases:
 *   - Trial:  immediate cancellation (no more access)
 *   - Active: cancel at period end (access until current_period_end)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // ── Auth: JWT aus Authorization-Header verifizieren ──────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: CORS });
  }

  // ── Subscription aus Supabase holen ──────────────────────────────────────
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (subErr || !sub) {
    return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404, headers: CORS });
  }

  if (!sub.stripe_subscription_id) {
    return new Response(JSON.stringify({ error: 'No Stripe subscription linked' }), { status: 400, headers: CORS });
  }

  if (sub.status !== 'trialing' && sub.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Subscription is not active' }), { status: 400, headers: CORS });
  }

  const isTrial = sub.status === 'trialing';

  try {
    let periodEnd: string;

    if (isTrial) {
      // ── Trial: sofort kündigen ────────────────────────────────────────────
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      periodEnd = new Date().toISOString();

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

    } else {
      // ── Aktiv: Kündigung zum Periodenende ─────────────────────────────────
      const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      periodEnd = new Date(updated.current_period_end * 1000).toISOString();

      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    // ── Bestätigungs-E-Mail senden ────────────────────────────────────────
    const email    = user.email ?? '';
    const meta     = user.user_metadata ?? {};
    const name     = (meta.full_name ?? email.split('@')[0]).split(' ')[0] || 'du';
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (resendKey && email) {
      const periodEndFmt = new Date(periodEnd).toLocaleDateString('de-DE', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      const subject = isTrial
        ? 'Dein Testzugang wurde beendet'
        : 'Dein Abonnement wurde gekündigt';

      const headline = isTrial
        ? 'Dein Testzugang wurde beendet.'
        : 'Kündigung bestätigt.';

      const bodyText = isTrial
        ? `dein 14-tägiger Testzugang bei Scherbius Analytics wurde sofort beendet. Du hast ab sofort keinen Zugang mehr zu den Portfolio-Updates.`
        : `dein Abonnement bei Scherbius Analytics wurde zum Ende der aktuellen Abrechnungsperiode gekündigt. Du hast noch bis zum <strong style="color:#1A1A1A;">${periodEndFmt}</strong> vollen Zugang zu allen Portfolio-Updates.`;

      const infoItems = isTrial
        ? [
            'Kein weiterer Zugang zu Portfolio-Updates',
            'Es entstehen keine Kosten',
            'Jederzeit erneut starten unter scherbius.de',
          ]
        : [
            `Zugang aktiv bis ${periodEndFmt}`,
            'Keine weiteren Zahlungen',
            'Jederzeit erneut abonnieren unter scherbius.de',
          ];

      const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F7F5F2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F5F2;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:4px;overflow:hidden;border:1px solid #E8E5E0;">
        <tr><td style="background-color:#1A1A1A;padding:28px 40px;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#FFFFFF;letter-spacing:-0.3px;">Scherbius Analytics</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#1A1A1A;line-height:1.2;">${headline}</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.75;">Hallo ${name},<br><br>${bodyText}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
            <tr><td style="border-left:3px solid #1A1A1A;padding:18px 22px;background-color:#F7F5F2;">
              <p style="margin:0 0 8px;font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#1A1A1A;">Zusammenfassung</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                ${infoItems.map(i => `<tr><td style="padding:3px 0;font-size:12px;color:#6B7280;">&#8212;&nbsp;&nbsp;${i}</td></tr>`).join('')}
              </table>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.7;">Fragen? Schreib uns: <a href="mailto:kaya@scherbius.de" style="color:#B91C1C;text-decoration:none;">kaya@scherbius.de</a></p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #E8E5E0;background-color:#F7F5F2;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">Scherbius Analytics UG (haftungsbeschränkt) · Horner Landstraße 130 · 22111 Hamburg</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Scherbius Analytics <noreply@scherbius.de>',
          to: [email],
          subject,
          html,
        }),
      });

      console.log(`Cancellation email sent to ${email} (trial: ${isTrial})`);
    }

    return new Response(
      JSON.stringify({ success: true, isTrial, periodEnd }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Cancel error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: CORS });
  }
});
