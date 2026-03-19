/**
 * archive-updates — Supabase Edge Function (Deno)
 *
 * Öffentlicher Endpunkt: gibt Portfolio-Updates frei, die ≥5 Handelstage alt sind.
 * Keine Authentifizierung erforderlich — die Zeitsperre ist die Zugangskontrolle.
 *
 * Deployment:
 *   supabase functions deploy archive-updates --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Zieht N Handelstage (Mo–Fr) von einem Datum ab. */
function subtractTradingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--; // Wochenenden überspringen
  }
  return d;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Alle Dateien aus dem privaten Bucket laden
    const { data: files, error } = await supabase.storage
      .from('portfolio-updates')
      .list('', { sortBy: { column: 'name', order: 'desc' }, limit: 200 });

    if (error) throw error;

    // Update-Nummer aus Dateinamen extrahieren: "Portfolio-Update-65.pdf" → 65
    const withNumber = (files ?? []).map(file => {
      const m = file.name.match(/Portfolio-Update-(\d+)/i);
      return { ...file, nr: m ? parseInt(m[1], 10) : -1 };
    }).filter(f => f.nr >= 0);

    // Nach Nummer sortieren (neueste zuerst)
    withNumber.sort((a, b) => b.nr - a.nr);

    // Cutoff: heute minus 5 Handelstage (Datum aus Dateinamen, Fallback: created_at)
    const cutoff = subtractTradingDays(new Date(), 5);
    const publicFiles = withNumber.filter(file => {
      const match = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
      const fileDate = match ? new Date(match[1]) : new Date(file.created_at);
      return fileDate <= cutoff;
    });

    // Für jede öffentliche Datei eine signed URL generieren (1 Stunde gültig)
    const results = await Promise.all(
      publicFiles.map(async file => {
        const { data: signed } = await supabase.storage
          .from('portfolio-updates')
          .createSignedUrl(file.name, 3600);

        // Datum aus Dateinamen extrahieren für Anzeige
        const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
        const dateObj = dateMatch ? new Date(dateMatch[1] + 'T12:00:00Z') : new Date(file.created_at);
        const date = dateObj.toLocaleDateString('de-DE', {
          day: '2-digit', month: 'long', year: 'numeric'
        });

        return {
          name: file.name,
          nr: file.nr,
          date,
          created_at: file.created_at,
          url: signed?.signedUrl ?? null,
        };
      })
    );

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('archive-updates error:', err);
    return new Response(JSON.stringify({ error: 'Interner Fehler' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
