/**
 * Stripe Webhook — Supabase Edge Function (Deno)
 *
 * Deployment:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Required Secrets (supabase secrets set):
 *   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → Signing secret
 *   SUPABASE_URL            — automatically set by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — from Supabase Settings → API
 *
 * Stripe events handled:
 *   - checkout.session.completed          → create subscription record (trialing or active)
 *   - customer.subscription.updated       → sync status changes (trial→active, past_due, etc.)
 *   - customer.subscription.deleted       → mark as canceled
 *   - invoice.payment_succeeded           → confirm active, update period end
 *   - invoice.payment_failed              → mark as past_due
 *   - customer.subscription.trial_will_end → (logged, can trigger reminder email later)
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

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or secret', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature invalid', { status: 400 });
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {

      // ── Checkout completed → subscription is now active ──────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const customerEmail = session.customer_details?.email ?? session.customer_email;

        if (!customerEmail) {
          console.warn('No customer email in checkout session');
          break;
        }

        // Fetch the subscription details from Stripe for period end date
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

        // Find Supabase user by email
        const { data: userData, error: userErr } = await supabase.auth.admin.listUsers();
        if (userErr) throw userErr;

        const user = userData.users.find(u => u.email === customerEmail);
        if (!user) {
          console.warn(`No Supabase user found for email: ${customerEmail}`);
          break;
        }

        // Upsert subscription record — use Stripe's actual status (trialing | active | ...)
        const trialEnd = stripeSub.trial_end
          ? new Date(stripeSub.trial_end * 1000).toISOString()
          : null;

        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: stripeSub.status,
            plan: 'retail',
            trial_ends_at: trialEnd,
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;
        console.log(`Activated subscription for user ${user.id}`);
        break;
      }

      // ── Subscription updated (renewal, plan change, etc.) ─────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const stripeStatus = sub.status; // active | past_due | canceled | trialing | ...

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: stripeStatus,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        if (error) throw error;
        console.log(`Updated subscription ${sub.id} → status: ${stripeStatus}`);
        break;
      }

      // ── Subscription deleted (canceled at period end) ─────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        if (error) throw error;
        console.log(`Canceled subscription ${sub.id}`);
        break;
      }

      // ── Invoice paid → confirm active status + update period end ──────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subId);

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: stripeSub.status,
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId);

        if (error) throw error;
        console.log(`Invoice paid — subscription ${subId} status: ${stripeSub.status}`);
        break;
      }

      // ── Invoice payment failed → mark as past_due ─────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId);

        if (error) throw error;
        console.log(`Invoice payment failed — subscription ${subId} → past_due`);
        break;
      }

      // ── Trial ending in 3 days → Reminder-E-Mail via Resend ─────────────
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Kundendetails aus Stripe holen
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email;
        const name  = (customer.metadata?.full_name || customer.name || '').split(' ')[0] || 'du';

        if (!email) {
          console.warn(`No email for customer ${customerId}`);
          break;
        }

        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
          : 'in 3 Tagen';

        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (!resendKey) {
          console.warn('RESEND_API_KEY not set — skipping reminder email');
          break;
        }

        const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F7F5F2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F5F2;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:4px;overflow:hidden;border:1px solid #E8E5E0;">
        <!-- Header -->
        <tr><td style="background-color:#1A1A1A;padding:28px 40px;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#FFFFFF;letter-spacing:-0.3px;">Scherbius Analytics</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#1A1A1A;line-height:1.2;">Dein Testzugang endet in 3 Tagen.</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.75;">Hallo ${name},<br><br>
          dein 14-tägiger Testzeitraum bei Scherbius Analytics endet am <strong style="color:#1A1A1A;">${trialEnd}</strong>. Ab diesem Datum wird deine hinterlegte Zahlungsmethode mit <strong style="color:#1A1A1A;">€39,99/Monat</strong> belastet und du behältst vollen Zugang zu allen täglichen Portfolio-Updates.</p>
          <p style="margin:0 0 32px;font-size:14px;color:#6B7280;line-height:1.75;">Möchtest du dein Abonnement verwalten, kündigen oder die Zahlungsmethode ändern? Das geht jederzeit über das Kundenportal:</p>
          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
            <tr><td style="background-color:#B91C1C;border-radius:2px;">
              <a href="https://billing.stripe.com/p/login/28E00c4rAc3T4f78WN6c001" style="display:inline-block;padding:14px 36px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;border-radius:2px;">Abonnement verwalten</a>
            </td></tr>
          </table>
          <!-- Info box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
            <tr><td style="border-left:3px solid #B91C1C;padding:18px 22px;background-color:#F7F5F2;">
              <p style="margin:0 0 8px;font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#B91C1C;">Was nach dem Trial passiert</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:3px 0;font-size:12px;color:#6B7280;">&#8212;&nbsp;&nbsp;Automatische Verlängerung: €39,99/Monat ab ${trialEnd}</td></tr>
                <tr><td style="padding:3px 0;font-size:12px;color:#6B7280;">&#8212;&nbsp;&nbsp;Kündigung jederzeit möglich — auch heute noch</td></tr>
                <tr><td style="padding:3px 0;font-size:12px;color:#6B7280;">&#8212;&nbsp;&nbsp;Kein Zugang verloren bis Ende des Abrechnungszeitraums</td></tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.7;">Fragen? Schreib uns: <a href="mailto:kaya@scherbius.de" style="color:#B91C1C;text-decoration:none;">kaya@scherbius.de</a></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #E8E5E0;background-color:#F7F5F2;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">Scherbius Analytics UG (haftungsbeschränkt) · Horner Landstraße 130 · 22111 Hamburg</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Scherbius Analytics <noreply@scherbius.de>',
            to: [email],
            subject: 'Dein Testzugang endet in 3 Tagen',
            html,
          }),
        });

        if (!resendResp.ok) {
          const err = await resendResp.text();
          console.error('Resend error:', err);
        } else {
          console.log(`Trial reminder sent to ${email}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
