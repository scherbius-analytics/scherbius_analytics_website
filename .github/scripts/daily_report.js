#!/usr/bin/env node
/**
 * Scherbius Analytics — Daily Report
 *
 * Queries Supabase (subscriptions + auth) and Stripe (payment details),
 * generates a branded HTML email, sends via Resend.
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY, RESEND_API_KEY, REPORT_EMAIL
 */

'use strict';

const SUPABASE_URL     = process.env.SUPABASE_URL     || 'https://lmhefszwflbwznmoyymd.supabase.co';
const SB_KEY           = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY       = process.env.STRIPE_SECRET_KEY;
const RESEND_KEY       = process.env.RESEND_API_KEY;
const REPORT_TO        = process.env.REPORT_EMAIL || 'kaya@scherbius.de';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  return res.json();
}

async function stripeFetch(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Basic ${Buffer.from(STRIPE_KEY + ':').toString('base64')}` },
  });
  if (!res.ok) throw new Error(`Stripe ${path} → ${res.status}`);
  return res.json();
}

function fmt(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysLeft(isoDate) {
  if (!isoDate) return null;
  const diff = Math.ceil((new Date(isoDate) - new Date()) / 86400000);
  return diff;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchSubscriptions() {
  return sbFetch('/rest/v1/subscriptions?select=*&order=updated_at.desc');
}

async function fetchAuthUsers() {
  const data = await sbFetch('/auth/v1/admin/users?per_page=200');
  const users = data.users || [];
  const map = {};
  for (const u of users) map[u.id] = u;
  return map;
}

async function fetchStripeSubscription(subId) {
  try {
    return await stripeFetch(`/subscriptions/${subId}`);
  } catch {
    return null;
  }
}

async function fetchPageViews() {
  try {
    const now = new Date();
    const dayAgo   = new Date(now - 86400000).toISOString();
    const weekAgo  = new Date(now - 7 * 86400000).toISOString();
    const monthAgo = new Date(now - 30 * 86400000).toISOString();

    const [day, week, month] = await Promise.all([
      sbFetch(`/rest/v1/page_views?select=count&created_at=gte.${dayAgo}`, { headers: { Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' } }).catch(() => null),
      sbFetch(`/rest/v1/page_views?select=count&created_at=gte.${weekAgo}`, { headers: { Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' } }).catch(() => null),
      sbFetch(`/rest/v1/page_views?select=count&created_at=gte.${monthAgo}`, { headers: { Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' } }).catch(() => null),
    ]);

    return { day, week, month };
  } catch {
    return null;
  }
}

// ── Categorize users ──────────────────────────────────────────────────────────

function categorize(subs, authUsers) {
  const active     = [];  // status = active
  const trialing   = [];  // status = trialing, has stripe_subscription_id (payment method stored)
  const noPayment  = [];  // pending_payment or trialing without stripe sub

  for (const sub of subs) {
    const user = authUsers[sub.user_id] || {};
    const meta = user.user_metadata || {};
    const email = user.email || '—';
    const name  = meta.full_name || email.split('@')[0];
    const isTest = sub.current_period_end === '2099-12-31T23:59:59+00:00';

    const entry = { sub, user, email, name, isTest };

    if (sub.status === 'active') {
      active.push(entry);
    } else if (sub.status === 'trialing' && sub.stripe_subscription_id) {
      trialing.push(entry);
    } else {
      noPayment.push(entry);
    }
  }

  return { active, trialing, noPayment };
}

// ── HTML building blocks ──────────────────────────────────────────────────────

function statusBadge(text, color) {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:2px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:${color};color:#fff;">${text}</span>`;
}

function userRow(entry, badge) {
  const { email, name, sub, isTest } = entry;
  const dl = daysLeft(sub.trial_ends_at || sub.current_period_end);
  const dateLabel = sub.status === 'trialing'
    ? `Trial bis ${fmt(sub.trial_ends_at)}`
    : sub.status === 'active' && !isTest
    ? `verlängert ${fmt(sub.current_period_end)}`
    : isTest ? 'Test-Account (intern)' : '—';

  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;vertical-align:top;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#1A1A1A;">${name}${isTest ? ' <span style="font-size:10px;color:#9CA3AF;">(Test)</span>' : ''}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6B7280;">${email}</p>
      </td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid #F0EDE8;vertical-align:top;text-align:right;white-space:nowrap;">
        ${badge}
        <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;">${dateLabel}</p>
      </td>
    </tr>`;
}

function sectionHeader(title, count, color) {
  return `
    <tr><td colspan="2" style="padding:24px 0 8px;">
      <p style="margin:0;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${color};">${title} <span style="font-size:11px;letter-spacing:0;font-weight:400;color:#9CA3AF;">(${count})</span></p>
    </td></tr>`;
}

function emptyRow(msg) {
  return `<tr><td colspan="2" style="padding:8px 0 16px;font-size:13px;color:#9CA3AF;font-style:italic;">${msg}</td></tr>`;
}

// ── Metric box ────────────────────────────────────────────────────────────────

function metricBox(label, value, sub = '') {
  return `
    <td style="width:33%;padding:0 8px;text-align:center;">
      <div style="background:#F7F5F2;border:1px solid #E8E5E0;border-radius:4px;padding:18px 12px;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#1A1A1A;font-family:Georgia,'Times New Roman',serif;">${value}</p>
        <p style="margin:4px 0 0;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6B7280;">${label}</p>
        ${sub ? `<p style="margin:2px 0 0;font-size:10px;color:#9CA3AF;">${sub}</p>` : ''}
      </div>
    </td>`;
}

// ── Assemble email HTML ───────────────────────────────────────────────────────

function buildHtml({ active, trialing, noPayment, views, reportDate }) {
  const activeRows   = active.map(e   => userRow(e, statusBadge('Aktiv',   '#047857'))).join('');
  const trialingRows = trialing.map(e => userRow(e, statusBadge('Trial',   '#B45309'))).join('');
  const noPayRows    = noPayment.map(e => userRow(e, statusBadge('Kein Abo','#6B7280'))).join('');

  const totalPaying = active.filter(e => !e.isTest).length + trialing.length;
  const hasViews = views && views.day !== null;

  const viewDay   = hasViews ? (views.day   || 0) : '—';
  const viewWeek  = hasViews ? (views.week  || 0) : '—';
  const viewMonth = hasViews ? (views.month || 0) : '—';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F7F5F2;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F5F2;padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#FFFFFF;border-radius:4px;overflow:hidden;border:1px solid #E8E5E0;">

      <!-- Header -->
      <tr><td style="background-color:#1A1A1A;padding:28px 40px;border-bottom:3px solid #B91C1C;">
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:#FFFFFF;letter-spacing:-0.3px;">Scherbius Analytics</p>
        <p style="margin:6px 0 0;font-size:9px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#6B7280;">Täglicher Report · ${reportDate}</p>
      </td></tr>

      <!-- KPI Row -->
      <tr><td style="padding:28px 40px 0;">
        <p style="margin:0 0 14px;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#B91C1C;">Übersicht</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr style="margin:0 -8px;">
            ${metricBox('Zahlende Nutzer', totalPaying)}
            ${metricBox('Im Trial', trialing.length, 'mit Zahlungsmethode')}
            ${metricBox('Ohne Abo', noPayment.length)}
          </tr>
        </table>
      </td></tr>

      <!-- Traffic -->
      <tr><td style="padding:24px 40px 0;">
        <p style="margin:0 0 14px;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#B91C1C;">Website Traffic</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${metricBox('Heute', viewDay)}
            ${metricBox('7 Tage', viewWeek)}
            ${metricBox('30 Tage', viewMonth)}
          </tr>
        </table>
        ${!hasViews ? `<p style="margin:10px 0 0;font-size:11px;color:#9CA3AF;font-style:italic;">Tracking noch nicht aktiv — SQL-Migration erforderlich (siehe Readme).</p>` : ''}
      </td></tr>

      <!-- User Lists -->
      <tr><td style="padding:28px 40px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

          <!-- Aktive Abonnenten -->
          ${sectionHeader('Zahlende Abonnenten', active.length, '#047857')}
          ${active.length ? activeRows : emptyRow('Keine aktiven Abonnenten.')}

          <!-- Trial mit Zahlungsmethode -->
          ${sectionHeader('Trial — Zahlungsmethode hinterlegt', trialing.length, '#B45309')}
          ${trialing.length ? trialingRows : emptyRow('Keine Trial-Nutzer mit Zahlungsmethode.')}

          <!-- Kein Abo -->
          ${sectionHeader('Registriert — Kein Abo', noPayment.length, '#6B7280')}
          ${noPayment.length ? noPayRows : emptyRow('Alle Nutzer haben ein Abo oder Trial.')}

        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 40px;margin-top:20px;border-top:1px solid #E8E5E0;background-color:#F7F5F2;">
        <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
          Automatischer Report · Scherbius Analytics UG · täglich 20:00 Uhr<br>
          Fragen: <a href="mailto:kaya@scherbius.de" style="color:#B91C1C;text-decoration:none;">kaya@scherbius.de</a>
        </p>
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
    throw new Error('Missing required env vars: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY');
  }

  console.log('Fetching data...');
  const [subs, authUsers, views] = await Promise.all([
    fetchSubscriptions(),
    fetchAuthUsers(),
    fetchPageViews(),
  ]);

  const { active, trialing, noPayment } = categorize(subs, authUsers);

  const reportDate = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  const html = buildHtml({ active, trialing, noPayment, views, reportDate });

  console.log(`Report: ${active.length} aktiv, ${trialing.length} trial, ${noPayment.length} kein Abo`);

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Scherbius Analytics <noreply@scherbius.de>',
      to: [REPORT_TO],
      subject: `Analytics Report · ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
      html,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Resend error: ${err}`);
  }

  console.log(`Report sent to ${REPORT_TO}`);
}

main().catch(err => {
  console.error('Report failed:', err);
  process.exit(1);
});
