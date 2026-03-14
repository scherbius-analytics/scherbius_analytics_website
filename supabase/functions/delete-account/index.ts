/**
 * Scherbius Analytics — delete-account Edge Function
 *
 * Löscht den aktuell eingeloggten User vollständig (auth + profiles + subscriptions).
 * Die Cascade-Löschung in der DB übernimmt profiles + subscriptions automatisch.
 *
 * Deployment:
 *   supabase functions deploy delete-account --project-ref lmhefszwflbwznmoyymd
 *
 * Aufruf (Frontend):
 *   POST /functions/v1/delete-account
 *   Header: Authorization: Bearer <user-jwt>
 *   Body:   { "confirm_email": "user@example.com" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    // 1. JWT des eingeloggten Users verifizieren
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const userJwt = authHeader.replace('Bearer ', '');

    // Client mit User-JWT (um User-Identität zu prüfen)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${userJwt}` } } }
    );

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Session ungültig' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2. E-Mail-Bestätigung aus Request-Body prüfen
    let body: { confirm_email?: string } = {};
    try { body = await req.json(); } catch { /* kein Body */ }

    if (!body.confirm_email || body.confirm_email.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'E-Mail-Adresse stimmt nicht überein' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 3. Admin-Client mit Service Role (kann User löschen)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. User löschen (cascade löscht profiles + subscriptions automatisch)
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error('deleteUser error:', deleteErr);
      return new Response(JSON.stringify({ error: 'Löschen fehlgeschlagen' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Account gelöscht: ${user.email} (${user.id})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
