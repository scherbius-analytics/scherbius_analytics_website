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
 *   - checkout.session.completed          → activate subscription after payment
 *   - customer.subscription.updated       → sync status changes
 *   - customer.subscription.deleted       → mark as canceled
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

        // Upsert subscription record
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            plan: 'retail',
            trial_ends_at: null,
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
