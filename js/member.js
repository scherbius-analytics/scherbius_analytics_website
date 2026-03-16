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
    _lockMode();
    _renderHeader();
    _renderStatusBadge();
    _updateStripeLinks();
    _lockUpdatesTab();
    _bindTabs();
    _bindSignout();
    // Wenn kein aktives Abo: direkt zum Abonnement-Tab, nicht Updates
    var hasAccess = _subscription && (_subscription.status === 'active' || _subscription.status === 'trialing');
    _loadTab(hasAccess ? 'updates' : 'subscription');
    if (typeof window._fillSettings === 'function') window._fillSettings(_session);

    // Nach Rückkehr von Stripe: Status pollen bis Webhook durchgelaufen ist
    var params = new URLSearchParams(window.location.search);
    if (params.get('from_stripe') === '1' && !hasAccess) {
      _pollSubscriptionStatus();
    }
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

  // ── Mode lock (Mitgliederbereich) ─────────────────────────────────────────

  function _lockMode() {
    var meta = _session.user.user_metadata;

    // Modus aus Metadata lesen; Fallback auf Subscription-Plan
    var mode = 'retail';
    if (meta && meta.mode) {
      mode = meta.mode;
    } else if (_subscription && _subscription.plan === 'institutional') {
      mode = 'institutional';
    }

    // Modus setzen und localStorage überschreiben
    document.documentElement.setAttribute('data-mode', mode);
    try { localStorage.setItem('sa_mode', mode); } catch (e) {}

    // Mode-Toggle im Mitgliederbereich ausblenden
    document.querySelectorAll('.mode-toggle').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  // ── Tab Lock (kein Abo) ───────────────────────────────────────────────────

  function _lockUpdatesTab() {
    var hasAccess = _subscription && (_subscription.status === 'active' || _subscription.status === 'trialing');
    if (hasAccess) return;

    var tab = document.querySelector('.member-tab[data-tab="updates"]');
    if (!tab) return;

    tab.innerHTML = 'Portfolio-Updates <span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:rgba(185,28,28,0.15);border-radius:2px;margin-left:6px;font-size:9px;line-height:1;">&#128274;</span>';
    tab.style.opacity = '0.5';
    tab.style.cursor  = 'not-allowed';
    tab.dataset.locked = '1';
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function _bindTabs() {
    document.querySelectorAll('.member-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.dataset.locked === '1') return; // Gesperrter Tab: ignorieren
        _loadTab(tab.dataset.tab);
      });
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
      var payLink = (window.SA_CONFIG && SA_CONFIG.STRIPE_PAYMENT_LINK_MONTHLY) ? SA_CONFIG.STRIPE_PAYMENT_LINK_MONTHLY : '../../pages/pricing.html';
      container.innerHTML =
        '<div style="border:1px solid var(--border);border-radius:4px;overflow:hidden;max-width:560px;">' +
          '<div style="padding:36px 40px;">' +
            '<p style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent);margin-bottom:16px;">Kein aktives Abonnement</p>' +
            '<h3 style="font-family:\'EB Garamond\',serif;font-size:24px;font-weight:500;color:var(--dark);margin-bottom:12px;">Portfolio-Updates freischalten</h3>' +
            '<p style="font-size:13px;color:var(--text-muted);line-height:1.75;margin-bottom:28px;">' +
              'Um auf die täglichen Portfolio-Updates zuzugreifen, benötigst du ein aktives Abonnement. ' +
              'Starte jetzt deinen 14-tägigen Testzeitraum — du wirst erst nach Ablauf belastet.' +
            '</p>' +
            '<div style="display:flex;flex-direction:column;gap:10px;">' +
              '<a href="' + payLink + '" class="btn btn-primary" style="justify-content:center;padding:14px 28px;">14 Tage kostenlos testen &rarr;</a>' +
              '<p style="font-size:11px;color:var(--text-dim);line-height:1.6;margin:0;">' +
                'Kreditkarte erforderlich &nbsp;&middot;&nbsp; Erst nach Ablauf belastet &nbsp;&middot;&nbsp; Monatlich kündbar' +
              '</p>' +
            '</div>' +
          '</div>' +
          '<div style="border-top:1px solid var(--border);padding:16px 40px;background:#F7F5F2;">' +
            '<p style="font-size:11px;color:var(--text-dim);line-height:1.6;margin:0;">' +
              'Fragen zum Abonnement? <a href="mailto:kaya@scherbius.de" style="color:var(--text-muted);">kaya@scherbius.de</a>' +
            '</p>' +
          '</div>' +
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
        sortBy: { column: 'name', order: 'desc' },
        limit: 50
      });
      if (result.error || !result.data || result.data.length === 0) throw new Error('empty');
      // Nach Dateiname-Datum sortieren (neueste zuerst)
      result.data.sort(function (a, b) {
        var da = (a.name.match(/^(\d{4}-\d{2}-\d{2})/) || ['',''])[1];
        var db = (b.name.match(/^(\d{4}-\d{2}-\d{2})/) || ['',''])[1];
        return db.localeCompare(da);
      });
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
      var label     = file.name.replace('.pdf', '').replace(/_/g, ' ');
      var dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
      var dateObj   = dateMatch ? new Date(dateMatch[1] + 'T12:00:00Z') : new Date(file.created_at);
      var date      = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
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
    var portalBtn   = document.getElementById('stripe-portal-btn');
    var upgradeBtn  = document.getElementById('upgrade-btn');

    var hasStripe = _subscription && _subscription.stripe_subscription_id;
    var isLive    = _subscription && (_subscription.status === 'active' || _subscription.status === 'trialing');

    if (portalBtn) {
      var portalUrl = SA_CONFIG.STRIPE_CUSTOMER_PORTAL_URL;
      if (hasStripe && isLive && portalUrl) {
        portalBtn.href = portalUrl;
        portalBtn.style.display = 'flex';
      } else {
        portalBtn.style.display = 'none';
      }
    }

    if (upgradeBtn) {
      if (isLive && hasStripe) {
        // Already subscribed — hide upgrade CTA
        upgradeBtn.style.display = 'none';
      } else {
        // Needs to subscribe — send to Stripe Payment Link
        var payLink = SA_CONFIG.STRIPE_PAYMENT_LINK_MONTHLY;
        upgradeBtn.href = payLink || '../pricing.html';
        upgradeBtn.textContent = 'Abonnement aktivieren (14 Tage kostenlos testen)';
        upgradeBtn.style.display = 'flex';
      }
    }
  }

  // ── Stripe-Links mit User-Kontext befüllen ────────────────────────────────

  function _updateStripeLinks() {
    if (!_session) return;
    var email  = _session.user.email || '';
    var userId = _session.user.id || '';
    var base   = SA_CONFIG && SA_CONFIG.STRIPE_PAYMENT_LINK_MONTHLY;
    if (!base || base === '#') return;

    var link = base
      + '?prefilled_email=' + encodeURIComponent(email)
      + '&client_reference_id=' + encodeURIComponent(userId);

    // Welcome-Banner-Link (confirmed=1)
    var bannerLink = document.getElementById('banner-stripe-link');
    if (bannerLink) bannerLink.href = link;
    document.querySelectorAll('.welcome-banner a').forEach(function (a) {
      if (a.href && a.href.indexOf('stripe.com') !== -1) a.href = link;
    });
    // Upgrade-Button im Subscription-Tab
    var upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) upgradeBtn.href = link;
    // Updates-Tab Freischalten-Link (wird dynamisch gerendert — setzen wir via Delegation)
    window._stripePayLink = link;
  }

  // ── Polling nach Stripe-Checkout ──────────────────────────────────────────

  function _pollSubscriptionStatus() {
    var badge  = document.getElementById('sub-status-badge');
    if (badge) {
      badge.textContent = 'Wird aktiviert…';
      badge.className   = 'sub-badge sub-badge-inactive';
    }

    var attempts = 0;
    var maxAttempts = 24; // 24 × 5s = 2 Minuten

    var interval = setInterval(async function () {
      attempts++;
      var sub = await SA_Auth.getSubscription(_session.user.id);
      var active = sub && (sub.status === 'active' || sub.status === 'trialing');

      if (active) {
        clearInterval(interval);
        _subscription = sub;
        _renderStatusBadge();
        _lockUpdatesTab();
        _loadTab('updates');
        // URL bereinigen
        history.replaceState(null, '', window.location.pathname);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        _renderStatusBadge();
      }
    }, 5000);
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
