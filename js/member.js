/**
 * Scherbius Analytics — Member Dashboard
 * Requires: config.js, auth.js, Supabase CDN
 */
var SA_Member = (function () {
  'use strict';

  var _session      = null;
  var _subscription = null;

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    _session = await SA_Auth.requireAuth();
    if (!_session) return;

    _subscription = await SA_Auth.getSubscription(_session.user.id);
    _renderHeader();
    _renderStatusBadge();
    _bindTabs();
    _bindSignout();
    _loadTab('updates');
    if (typeof window._fillSettings === 'function') window._fillSettings(_session);
  }

  // ── Header ────────────────────────────────────────────────────────────────

  function _renderHeader() {
    var nameEl  = document.getElementById('dash-greeting-name');
    var emailEl = document.getElementById('dash-user-email');
    var meta    = _session.user.user_metadata;
    if (nameEl) {
      nameEl.textContent = (meta && meta.full_name) ? meta.full_name.split(' ')[0] : _session.user.email;
    }
    if (emailEl) emailEl.textContent = _session.user.email;
  }

  // ── Status Badge ──────────────────────────────────────────────────────────

  function _renderStatusBadge() {
    var badge  = document.getElementById('sub-status-badge');
    var detail = document.getElementById('sub-status-detail');
    if (!badge) return;

    var labels = {
      trialing:        'Testzugang',
      active:          'Aktiv',
      canceled:        'Gekündigt',
      past_due:        'Zahlung ausstehend',
      pending_payment: 'Aktivierung ausstehend'
    };

    if (!_subscription) {
      badge.textContent = 'Kein Abonnement';
      badge.className   = 'sub-badge sub-badge-inactive';
      return;
    }

    badge.textContent = labels[_subscription.status] || _subscription.status;
    var isActive = _subscription.status === 'active' || _subscription.status === 'trialing';
    badge.className = 'sub-badge sub-badge-' + (isActive ? 'active' : 'inactive');

    if (detail) {
      if (_subscription.status === 'trialing' && _subscription.trial_ends_at) {
        var end       = new Date(_subscription.trial_ends_at);
        var remaining = Math.ceil((end - Date.now()) / 86400000);
        detail.textContent = remaining > 0
          ? remaining + ' Testtage verbleibend bis ' + end.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })
          : 'Testzeitraum abgelaufen — bitte Abonnement aktivieren.';
      } else if (_subscription.status === 'active' && _subscription.current_period_end) {
        var next = new Date(_subscription.current_period_end);
        detail.textContent = 'Nächste Abrechnung: ' + next.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
      } else if (_subscription.status === 'canceled') {
        detail.textContent = 'Zugang bleibt bis Ende des Abrechnungszeitraums aktiv.';
      }
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function _bindTabs() {
    document.querySelectorAll('.member-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { _loadTab(tab.dataset.tab); });
    });
  }

  function _loadTab(tabId) {
    document.querySelectorAll('.member-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    document.querySelectorAll('.member-panel').forEach(function (p) {
      p.style.display = (p.dataset.panel === tabId) ? 'block' : 'none';
    });
    if (tabId === 'updates')      _loadUpdates();
    if (tabId === 'subscription') _loadSubscriptionPanel();
  }

  // ── Panel: Updates ────────────────────────────────────────────────────────

  async function _loadUpdates() {
    var container = document.getElementById('updates-list');
    if (!container || container.dataset.loaded) return;

    var hasAccess = _subscription && (_subscription.status === 'active' || _subscription.status === 'trialing');
    if (!hasAccess) {
      container.innerHTML = '<div class="access-gate">' +
        '<p style="font-size:14px;font-weight:500;color:var(--dark);margin-bottom:12px;">Aktives Abonnement erforderlich</p>' +
        '<p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">Um auf die täglichen Portfolio-Updates zuzugreifen, benötigst du ein aktives Abonnement.</p>' +
        '<a href="../../pages/pricing.html" class="btn btn-primary">Abonnement aktivieren</a>' +
        '</div>';
      return;
    }

    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Lade Updates…</p>';

    if (SA_CONFIG.SUPABASE_URL === 'DEINE_SUPABASE_URL') {
      container.innerHTML = _demoPDFListHTML();
      container.dataset.loaded = '1';
      return;
    }

    try {
      var client = supabase.createClient(SA_CONFIG.SUPABASE_URL, SA_CONFIG.SUPABASE_ANON_KEY);
      var result = await client.storage.from('portfolio-updates').list('', {
        sortBy: { column: 'created_at', order: 'desc' },
        limit: 50
      });
      if (result.error || !result.data || result.data.length === 0) throw new Error('empty');
      await _renderPDFTable(container, result.data, client);
      container.dataset.loaded = '1';
    } catch (e) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">Noch keine Updates verfügbar. Bitte wende dich bei Fragen an <a href="mailto:kaya@scherbius.de">kaya@scherbius.de</a>.</p>';
    }
  }

  async function _renderPDFTable(container, files, client) {
    var rows = await Promise.all(files.map(async function (file) {
      var signed = await client.storage.from('portfolio-updates').createSignedUrl(file.name, 3600);
      var url    = signed.data ? signed.data.signedUrl : '#';
      var label  = file.name.replace('.pdf', '').replace(/_/g, ' ');
      var date   = new Date(file.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
      return '<tr>' +
        '<td style="font-weight:600;color:var(--dark);">' + date + '</td>' +
        '<td style="color:var(--text-muted);">' + label + '</td>' +
        '<td><a href="' + url + '" class="btn btn-secondary" style="padding:6px 14px;font-size:9px;" target="_blank" rel="noopener">PDF</a></td>' +
        '</tr>';
    }));
    container.innerHTML = '<table class="archive-table"><thead><tr><th>Datum</th><th>Beschreibung</th><th>Download</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>';
  }

  function _demoPDFListHTML() {
    var today = new Date();
    var rows  = '';
    var count = 0;
    var d     = new Date(today);
    while (count < 5) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        rows += '<tr>' +
          '<td style="font-weight:600;color:var(--dark);">' + d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) + '</td>' +
          '<td style="color:var(--text-muted);">Portfolio-Update — Tagesabschluss</td>' +
          '<td><span style="font-size:11px;color:var(--text-dim);">Nach Supabase-Einrichtung</span></td>' +
          '</tr>';
        count++;
      }
      d.setDate(d.getDate() - 1);
    }
    return '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:4px;padding:12px 20px;margin-bottom:20px;font-size:12px;color:#7F1D1D;">' +
      'Supabase noch nicht konfiguriert. Trage deine Daten in <code>js/config.js</code> ein und lade PDFs in den Bucket "portfolio-updates" hoch.' +
      '</div>' +
      '<table class="archive-table"><thead><tr><th>Datum</th><th>Beschreibung</th><th>Download</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  // ── Panel: Subscription ───────────────────────────────────────────────────

  function _loadSubscriptionPanel() {
    var portalBtn = document.getElementById('stripe-portal-btn');
    if (!portalBtn) return;
    var portalUrl = SA_CONFIG.STRIPE_CUSTOMER_PORTAL_URL;
    if (portalUrl && portalUrl !== 'https://billing.stripe.com/p/login/DEIN_PORTAL') {
      portalBtn.href = portalUrl;
    }
  }

  // ── Signout ───────────────────────────────────────────────────────────────

  function _bindSignout() {
    document.querySelectorAll('[data-action="signout"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        SA_Auth.signOut();
      });
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init: init };

})();
