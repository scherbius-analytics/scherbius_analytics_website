/**
 * Scherbius Analytics — Konfiguration
 *
 * Trage hier deine Supabase- und Stripe-Schlüssel ein.
 * Diese Datei enthält NUR öffentliche (anon/public) Schlüssel — sicher zur Auslieferung.
 *
 * SETUP-ANLEITUNG: siehe supabase/schema.sql
 */
var SA_CONFIG = {

  // ── Supabase ──────────────────────────────────────────────────────────────
  // Zu finden: Supabase Dashboard → Settings → API
  SUPABASE_URL:      'https://lmhefszwflbwznmoyymd.supabase.co',       // z.B. https://abcdef.supabase.co
  SUPABASE_ANON_KEY: 'sb_publishable_Gpb4Fd36giXILIt6Hcr5mg_8tV7lgud',   // beginnt mit "eyJ..."

  // ── Stripe ────────────────────────────────────────────────────────────────
  // Payment Link: Stripe Dashboard → Payment Links → Link erstellen → URL kopieren
  STRIPE_PAYMENT_LINK_MONTHLY: 'https://buy.stripe.com/test_5kQcN7bpH0R8b4w7Ue3wQ00',

  // Customer Portal: Stripe Dashboard → Settings → Billing → Customer Portal aktivieren
  STRIPE_CUSTOMER_PORTAL_URL: 'https://billing.stripe.com/p/login/3cIaEQaPYfg59zrgpf6c000',

  // ── App-Einstellungen ─────────────────────────────────────────────────────
  TRIAL_DAYS: 14

};
