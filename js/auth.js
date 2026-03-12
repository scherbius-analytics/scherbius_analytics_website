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
    var meta = { full_name: fullName, plan: plan };
    if (company) meta.company = company;
    var result = await _client.auth.signUp({
      email: email,
      password: password,
      options: { data: meta }
    });
    if (result.error) throw result.error;

    // Create subscription record
    if (result.data.user) {
      var trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + SA_CONFIG.TRIAL_DAYS);
      var subData = {
        user_id:    result.data.user.id,
        status:     plan === 'monthly' ? 'pending_payment' : 'trialing',
        plan:       'retail',
        trial_ends_at: plan === 'trial' ? trialEnd.toISOString() : null
      };
      await _client.from('subscriptions').insert(subData);
    }
    return result.data;
  }

  async function signOut() {
    if (_client) await _client.auth.signOut();
    updateNavState(null);
    window.location.href = _rootPath() + 'index.html';
  }

  async function resetPassword(email) {
    if (!_client) throw new Error('Supabase nicht konfiguriert.');
    var redirectTo = window.location.origin + '/' + _rootPath() + 'pages/members/login.html';
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

    if (session && session.user) {
      elOut.style.display = 'none';
      elIn.style.display  = 'flex';
      if (elName) {
        var meta = session.user.user_metadata;
        elName.textContent = (meta && meta.full_name)
          ? meta.full_name.split(' ')[0]
          : session.user.email;
      }
    } else {
      elOut.style.display = 'flex';
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
    getSession:     getSession,
    signIn:         signIn,
    signUp:         signUp,
    signOut:        signOut,
    resetPassword:  resetPassword,
    getSubscription:getSubscription,
    requireAuth:    requireAuth,
    updateNavState: updateNavState
  };

})();
