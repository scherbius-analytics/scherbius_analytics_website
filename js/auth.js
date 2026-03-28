/**
 * Scherbius Analytics — Auth Module
 * Supabase Email/Password Authentication + Nav State Management
 */
var SA_Auth = (function () {
  'use strict';

  var _client = null;

  // ── Init ──────────────────────────────────────────────────────────────────

  function _init() {
    if (typeof supabase === 'undefined') return;
    if (!window.SA_CONFIG || SA_CONFIG.SUPABASE_URL === 'DEINE_SUPABASE_URL') return;
    _client = supabase.createClient(SA_CONFIG.SUPABASE_URL, SA_CONFIG.SUPABASE_ANON_KEY);
    _restoreNavState();
  }

  // ── Auth actions ──────────────────────────────────────────────────────────

  async function getSession() {
    if (!_client) return null;
    var result = await _client.auth.getSession();
    return result.data.session;
  }

  async function signIn(email, password) {
    if (!_client) throw new Error('Supabase nicht konfiguriert.');
    var result = await _client.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
    return result.data;
  }

  async function signUp(email, password, fullName, plan, company) {
    if (!_client) throw new Error('Supabase nicht konfiguriert.');

    // ── IP-Check: Verhindert mehrfache Free Trials ─────────────────────────
    try {
      var ipResp = await fetch(SA_CONFIG.SUPABASE_URL + '/functions/v1/check-signup-ip', {
        method: 'POST',
        headers: { 'apikey': SA_CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      var ipData = await ipResp.json();
      if (ipData.allowed === false) {
        throw new Error(ipData.reason || 'Registrierung von dieser IP-Adresse nicht möglich.');
      }
    } catch (e) {
      // Nur blockieren wenn explizit denied — Netzwerkfehler erlauben (fail open)
      if (e.message && e.message.includes('IP-Adresse')) throw e;
    }

    var meta = { full_name: fullName, plan: plan, mode: plan === 'institutional' ? 'institutional' : 'retail' };
    if (company) meta.company = company;
    var confirmRedirect = window.location.origin + '/pages/members/dashboard.html?confirmed=1';
    var result = await _client.auth.signUp({
      email: email,
      password: password,
      options: { data: meta, emailRedirectTo: confirmRedirect }
    });
    if (result.error) throw result.error;

    // Create subscription record + log IP
    if (result.data.user) {
      var subData = {
        user_id: result.data.user.id,
        status:  'pending_payment',
        plan:    'retail',
      };
      await _client.from('subscriptions').insert(subData);

      // IP nach erfolgreicher Registrierung loggen
      try {
        fetch(SA_CONFIG.SUPABASE_URL + '/functions/v1/check-signup-ip', {
          method: 'POST',
          headers: { 'apikey': SA_CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'log', user_id: result.data.user.id })
        });
      } catch (e) { /* Nicht-kritisch */ }
    }
    return result.data;
  }

  async function signOut() {
    if (_client) await _client.auth.signOut();
    updateNavState(null);
    window.location.href = _rootPath() + 'index.html';
  }

  async function resendConfirmation(email) {
    if (!_client) throw new Error('Supabase nicht konfiguriert.');
    var confirmRedirect = window.location.origin + '/pages/members/dashboard.html?confirmed=1';
    var result = await _client.auth.resend({ type: 'signup', email: email, options: { emailRedirectTo: confirmRedirect } });
    if (result.error) throw result.error;
  }

  async function resetPassword(email) {
    if (!_client) throw new Error('Supabase nicht konfiguriert.');
    var redirectTo = window.location.origin + '/' + _rootPath() + 'pages/members/update-password.html';
    var result = await _client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });
    if (result.error) throw result.error;
  }

  async function getSubscription(userId) {
    if (!_client) return null;
    var result = await _client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return result.data;
  }

  // ── Route guard ───────────────────────────────────────────────────────────

  async function requireAuth() {
    var session = await getSession();
    if (!session) {
      var loginPath = _rootPath() + 'pages/members/login.html';
      window.location.href = loginPath + '?redirect=' + encodeURIComponent(window.location.pathname);
      return null;
    }
    updateNavState(session);
    return session;
  }

  // ── Nav state ─────────────────────────────────────────────────────────────

  async function _restoreNavState() {
    var session = await getSession();
    updateNavState(session);
    _client.auth.onAuthStateChange(function (_event, session) {
      updateNavState(session);
    });
  }

  function updateNavState(session) {
    var elOut  = document.getElementById('nav-auth-out');
    var elIn   = document.getElementById('nav-auth-in');
    var elName = document.getElementById('nav-user-name');
    if (!elOut || !elIn) return;

    var isRetail = document.documentElement.getAttribute('data-mode') === 'retail';

    if (session && session.user) {
      elOut.style.display = 'none';
      elIn.style.display  = isRetail ? 'flex' : 'none';
      if (elName && isRetail) {
        var meta = session.user.user_metadata;
        elName.textContent = (meta && meta.full_name)
          ? meta.full_name.split(' ')[0]
          : session.user.email;
      }
    } else {
      elOut.style.display = isRetail ? 'flex' : 'none';
      elIn.style.display  = 'none';
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _rootPath() {
    var p = window.location.pathname;
    if (p.includes('/pages/members/')) return '../../';
    if (p.includes('/pages/legal/'))   return '../../';
    if (p.includes('/pages/'))         return '../';
    return '';
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  return {
    getSession:          getSession,
    signIn:              signIn,
    signUp:              signUp,
    signOut:             signOut,
    resetPassword:       resetPassword,
    resendConfirmation:  resendConfirmation,
    getSubscription:     getSubscription,
    requireAuth:         requireAuth,
    updateNavState:      updateNavState
  };

})();
