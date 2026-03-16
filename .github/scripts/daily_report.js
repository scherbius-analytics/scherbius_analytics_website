#!/usr/bin/env node
/**
 * Scherbius Analytics — Daily Report
 * Queries Supabase + Stripe, sends branded HTML email via Resend.
 */

'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lmhefszwflbwznmoyymd.supabase.co';
const SB_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const REPORT_TO    = process.env.REPORT_EMAIL || 'kaya@scherbius.de';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${path} → ${res.status}: ${await res.text()}`);
  return { json: await res.json(), headers: res.headers };
}

function fmt(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysLeft(isoDate) {
  if (!isoDate) return null;
  return Math.ceil((new Date(isoDate) - new Date()) / 86400000);
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchSubscriptions() {
  const { json } = await sbFetch('/rest/v1/subscriptions?select=*&order=updated_at.desc');
  return json;
}

async function fetchAuthUsers() {
  const { json } = await sbFetch('/auth/v1/admin/users?per_page=200');
  const map = {};
  for (const u of (json.users || [])) map[u.id] = u;
  return map;
}

async function fetchPageViewCount(sinceIso) {
  try {
    // Supabase aggregate: select=count returns [{count: N}]
    const { json } = await sbFetch(
      `/rest/v1/page_views?select=count&created_at=gte.${sinceIso}`
    );
    if (Array.isArray(json) && json[0] != null) {
      return parseInt(json[0].count, 10) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

async function fetchPageViews() {
  const now      = new Date();
  const dayAgo   = new Date(now - 86400000).toISOString();
  const weekAgo  = new Date(now - 7 * 86400000).toISOString();
  const monthAgo = new Date(now - 30 * 86400000).toISOString();

  const [day, week, month] = await Promise.all([
    fetchPageViewCount(dayAgo),
    fetchPageViewCount(weekAgo),
    fetchPageViewCount(monthAgo),
  ]);

  return { day, week, month };
}

// ── Categorize ────────────────────────────────────────────────────────────────

function categorize(subs, authUsers) {
  const active    = [];
  const trialing  = [];
  const noPayment = [];

  for (const sub of subs) {
    const user  = authUsers[sub.user_id] || {};
    const meta  = user.user_metadata || {};
    const email = user.email || '—';
    const name  = meta.full_name || email.split('@')[0];
    const isTest = sub.current_period_end === '2099-12-31T23:59:59+00:00';
    const entry = { sub, email, name, isTest };

    if (sub.status === 'active')                                  active.push(entry);
    else if (sub.status === 'trialing' && sub.stripe_subscription_id) trialing.push(entry);
    else                                                          noPayment.push(entry);
  }

  return { active, trialing, noPayment };
}

// ── HTML components ───────────────────────────────────────────────────────────

function badge(text, bg) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:2px;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;background:${bg};color:#fff;">${text}</span>`;
}

function kpiCell(label, value, accent = false) {
  const numColor = accent ? '#B91C1C' : '#1A1A1A';
  return `
  <td style="width:25%;padding:0 6px;">
    <div style="background:#FAFAF8;border:1px solid #E8E5E0;border-top:3px solid ${accent ? '#B91C1C' : '#1A1A1A'};padding:16px 14px;text-align:center;">
      <p style="margin:0;font-size:32px;font-weight:700;color:${numColor};font-family:Georgia,'Times New Roman',serif;line-height:1;">${value ?? '—'}</p>
      <p style="margin:6px 0 0;font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9CA3AF;">${label}</p>
    </div>
  </td>`;
}

function divider() {
  return `<tr><td style="padding:0 40px;"><div style="height:1px;background:#E8E5E0;"></div></td></tr>`;
}

function sectionTitle(label, count, color) {
  return `
  <tr><td style="padding:28px 40px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-left:3px solid ${color};padding:0 0 0 12px;">
        <p style="margin:0;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${color};">${label}</p>
      </td>
      <td style="text-align:right;">
        <span style="font-size:11px;color:#9CA3AF;">${count} Nutzer</span>
      </td>
    </tr></table>
  </td></tr>`;
}

function userRow(entry, badgeHtml) {
  const { email, name, sub, isTest } = entry;
  const dl = daysLeft(sub.trial_ends_at || sub.current_period_end);
  let dateLabel = '—';
  if (isTest)               dateLabel = 'Test-Account';
  else if (sub.status === 'trialing') dateLabel = `Trial endet in ${dl} Tagen (${fmt(sub.trial_ends_at)})`;
  else if (sub.status === 'active')   dateLabel = `Nächste Zahlung: ${fmt(sub.current_period_end)}`;

  return `
  <tr>
    <td style="padding:0 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #F0EDE8;vertical-align:middle;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#1A1A1A;">${name}${isTest ? '&thinsp;<span style="font-size:10px;font-weight:400;color:#9CA3AF;">(intern)</span>' : ''}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">${email}&ensp;·&ensp;${dateLabel}</p>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #F0EDE8;vertical-align:middle;text-align:right;width:1%;white-space:nowrap;">
            ${badgeHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function emptyRow(msg) {
  return `<tr><td style="padding:10px 40px 20px;font-size:12px;color:#9CA3AF;font-style:italic;">${msg}</td></tr>`;
}

// ── Build HTML ────────────────────────────────────────────────────────────────

function buildHtml({ active, trialing, noPayment, views, reportDate, today }) {
  const totalPaying = active.filter(e => !e.isTest).length + trialing.length;
  const { day, week, month } = views;
  const trackingActive = day !== null;

  const activeRows   = active.map(e   => userRow(e, badge('Aktiv',    '#047857'))).join('');
  const trialingRows = trialing.map(e => userRow(e, badge('Trial',    '#92400E'))).join('');
  const noPayRows    = noPayment.map(e => userRow(e, badge('Kein Abo','#6B7280'))).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F0EDE8;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0EDE8;padding:40px 20px;">
  <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

    <!-- Header card -->
    <tr><td style="background:#1A1A1A;padding:32px 40px 28px;border-radius:4px 4px 0 0;">
      <p style="margin:0 0 4px;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#B91C1C;">Scherbius Analytics</p>
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#FFFFFF;line-height:1.2;">Täglicher Report</p>
      <p style="margin:8px 0 0;font-size:11px;color:#6B7280;">${reportDate}</p>
    </td></tr>

    <!-- Red accent line -->
    <tr><td style="background:#B91C1C;height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>

    <!-- White body -->
    <tr><td style="background:#FFFFFF;border-radius:0 0 4px 4px;overflow:hidden;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

      <!-- KPI: Abonnenten -->
      <tr><td style="padding:32px 40px 0;">
        <p style="margin:0 0 14px;font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#9CA3AF;">Abonnenten</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr style="margin:0 -6px;">
            ${kpiCell('Zahlend', totalPaying, true)}
            ${kpiCell('Im Trial', trialing.length)}
            ${kpiCell('Ohne Abo', noPayment.length)}
            ${kpiCell('Gesamt', active.length + trialing.length + noPayment.length)}
          </tr>
        </table>
      </td></tr>

      <!-- KPI: Traffic -->
      <tr><td style="padding:20px 40px 0;">
        <p style="margin:0 0 14px;font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#9CA3AF;">Website Traffic${!trackingActive ? ' <span style="color:#E8E5E0;letter-spacing:0;font-weight:400;">(Tracking noch nicht aktiv)</span>' : ''}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr style="margin:0 -6px;">
            ${kpiCell('Heute', trackingActive ? day : '—')}
            ${kpiCell('7 Tage', trackingActive ? week : '—')}
            ${kpiCell('30 Tage', trackingActive ? month : '—')}
            <td style="width:25%;padding:0 6px;"></td>
          </tr>
        </table>
      </td></tr>

      <!-- Spacer -->
      <tr><td style="padding:28px 0 0;"></td></tr>
      ${divider()}

      <!-- Zahlende Abonnenten -->
      ${sectionTitle('Zahlende Abonnenten', active.length, '#047857')}
      <tr><td style="padding:12px 0 0;"></td></tr>
      ${active.length ? activeRows : emptyRow('Keine aktiven Abonnenten.')}

      <tr><td style="padding:8px 0 0;"></td></tr>
      ${divider()}

      <!-- Trial -->
      ${sectionTitle('Trial — Zahlungsmethode hinterlegt', trialing.length, '#92400E')}
      <tr><td style="padding:12px 0 0;"></td></tr>
      ${trialing.length ? trialingRows : emptyRow('Keine Trial-Nutzer mit Zahlungsmethode.')}

      <tr><td style="padding:8px 0 0;"></td></tr>
      ${divider()}

      <!-- Kein Abo -->
      ${sectionTitle('Registriert — Kein Abo', noPayment.length, '#6B7280')}
      <tr><td style="padding:12px 0 0;"></td></tr>
      ${noPayment.length ? noPayRows : emptyRow('Alle Nutzer haben ein Abo oder Trial.')}

      <!-- Footer -->
      <tr><td style="padding:32px 40px;margin-top:8px;background:#FAFAF8;border-top:1px solid #E8E5E0;">
        <p style="margin:0;font-size:10px;color:#9CA3AF;line-height:1.8;">
          Automatischer Report · Scherbius Analytics UG (haftungsbeschränkt)<br>
          Horner Landstraße 130 · 22111 Hamburg · <a href="mailto:kaya@scherbius.de" style="color:#B91C1C;text-decoration:none;">kaya@scherbius.de</a>
        </p>
      </td></tr>

    </table>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SB_KEY || !STRIPE_KEY || !RESEND_KEY) {
    throw new Error('Missing env vars: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY');
  }

  console.log('Fetching data...');
  const [subs, authUsers, views] = await Promise.all([
    fetchSubscriptions(),
    fetchAuthUsers(),
    fetchPageViews(),
  ]);

  const { active, trialing, noPayment } = categorize(subs, authUsers);

  const now = new Date();
  const reportDate = now.toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const today = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const html = buildHtml({ active, trialing, noPayment, views, reportDate, today });

  console.log(`Report: ${active.length} aktiv, ${trialing.length} trial, ${noPayment.length} kein Abo | Traffic: ${views.day ?? 'n/a'}/Tag`);

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Scherbius Analytics <noreply@scherbius.de>',
      to: [REPORT_TO],
      subject: `Analytics Report · ${today}`,
      html,
    }),
  });

  if (!resp.ok) throw new Error(`Resend error: ${await resp.text()}`);
  console.log(`Sent to ${REPORT_TO}`);
}

main().catch(err => { console.error(err); process.exit(1); });
