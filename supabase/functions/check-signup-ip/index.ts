/**
 * Scherbius Analytics — check-signup-ip Edge Function
 *
 * Prüft ob eine IP-Adresse bereits einen Free Trial genutzt hat.
 * Wird vor der Registrierung aufgerufen.
 *
 * POST  → { "action": "check" }          Prüfen ob IP erlaubt ist
 * POST  → { "action": "log", "user_id": "..." }  IP nach erfolgreicher Registrierung loggen
 *
 * Deployment:
 *   supabase functions deploy check-signup-ip --no-verify-jwt --project-ref lmhefszwflbwznmoyymd
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IPs die grundsätzlich nie blockiert werden (z.B. bekannte Shared IPs)
const WHITELIST: string[] = [];

// Max. Anzahl an Trial-Anmeldungen pro IP
const MAX_TRIALS_PER_IP = 1;

function getClientIp(req: Request): string {
  // Vercel / Cloudflare / Standard Proxies
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const ip = getClientIp(req);

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let body: { action?: string; user_id?: string } = {};
  try { body = await req.json(); } catch { /* kein Body */ }

  // ── CHECK: Darf diese IP sich registrieren? ────────────────────────────
  if (!body.action || body.action === 'check') {
    if (ip === 'unknown') {
      // IP unbekannt → erlauben aber loggen
      return new Response(JSON.stringify({ allowed: true, warning: 'ip_unknown' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (WHITELIST.includes(ip)) {
      return new Response(JSON.stringify({ allowed: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { count, error } = await adminClient
      .from('ip_signups')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip);

    if (error) {
      console.error('IP check error:', error);
      // Bei DB-Fehler erlauben (fail open) — besser ein Missbrauch als legitimen User blockieren
      return new Response(JSON.stringify({ allowed: true, warning: 'db_error' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const trialCount = count ?? 0;
    if (trialCount >= MAX_TRIALS_PER_IP) {
      console.log(`IP ${ip} blocked — ${trialCount} existing trial(s)`);
      return new Response(JSON.stringify({
        allowed: false,
        reason: 'Von dieser IP-Adresse wurde bereits ein Testzugang erstellt. Für weitere Zugänge wende dich bitte an kaya@scherbius.de.',
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ allowed: true, ip }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // ── LOG: IP nach erfolgreicher Registrierung eintragen ────────────────
  if (body.action === 'log') {
    const { error } = await adminClient
      .from('ip_signups')
      .insert({ ip_address: ip, user_id: body.user_id ?? null });

    if (error) {
      console.error('IP log error:', error);
    } else {
      console.log(`IP logged: ${ip} → user ${body.user_id}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
