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
  // Payment Link (Live): 14-Tage Trial + 39,99 EUR/Monat recurring
  STRIPE_PAYMENT_LINK_MONTHLY: 'https://buy.stripe.com/28E00c4rAc3T4f78WN6c001',

  // Customer Portal: Abonnement verwalten, kündigen, Zahlungsmethode ändern
  STRIPE_CUSTOMER_PORTAL_URL: 'https://billing.stripe.com/p/login/28E00c4rAc3T4f78WN6c001',

  // ── App-Einstellungen ─────────────────────────────────────────────────────
  TRIAL_DAYS: 14

};
