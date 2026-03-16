/**
 * Scherbius Analytics — Page View Tracker
 * Logs each page visit to Supabase (page_views table).
 * Lightweight, no external dependencies.
 */
(function () {
  'use strict';

  // Session ID: einmal pro Browser-Session, keine PII
  var SESSION_KEY = 'sa_sid';
  var sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sid);
  }

  function track() {
    if (!window.SA_CONFIG || !SA_CONFIG.SUPABASE_URL) return;

    var payload = {
      page:       window.location.pathname,
      referrer:   document.referrer || null,
      session_id: sid,
    };

    fetch(SA_CONFIG.SUPABASE_URL + '/rest/v1/page_views', {
      method:  'POST',
      headers: {
        apikey:         SA_CONFIG.SUPABASE_ANON_KEY,
        Authorization:  'Bearer ' + SA_CONFIG.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify(payload),
    }).catch(function () { /* Tracking-Fehler still ignorieren */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
