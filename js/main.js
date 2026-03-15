/* ============================================================
   Scherbius Analytics — Main JS
   ============================================================ */

const SA = {
  MODE_KEY: 'sa_mode',
  mode: 'institutional', // default

  /* ── Initialise ─────────────────────────────────────────── */
  init() {
    this.mode = localStorage.getItem(this.MODE_KEY) || 'retail';
    if (typeof SA_Charts !== 'undefined') SA_Charts.init(this.mode);
    this._applyMode(this.mode, false);
    this._bindToggle();
    this._navScroll();
    this._hamburger();
    this._activeLinks();
    this._scrollReveal();
    this._counters();
  },

  /* ── Mode toggle ────────────────────────────────────────── */
  _bindToggle() {
    document.querySelectorAll('[data-mode-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.modeBtn;
        if (target === this.mode) return;
        this._applyMode(target, true);
      });
    });
  },

  _applyMode(mode, animate) {
    this.mode = mode;
    localStorage.setItem(this.MODE_KEY, mode);
    document.documentElement.setAttribute('data-mode', mode);

    // Toggle button states
    document.querySelectorAll('[data-mode-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.modeBtn === mode);
    });

    // Show/hide mode sections
    document.querySelectorAll('[data-show]').forEach(el => {
      const show = el.getAttribute('data-show');
      el.style.display = show === mode ? '' : 'none';
    });

    // Update charts if available
    if (typeof SA_Charts !== 'undefined' && SA_Charts.eq) {
      SA_Charts.switchMode(mode);
    }

    // Animate KPI counters on switch
    if (animate) this._runCounters();

    // Update dynamic KPI content
    this._updateKPIs(mode);
  },

  /* ── Dynamic KPI update ─────────────────────────────────── */
  _updateKPIs(mode) {
    const kpis = typeof SA_KPI !== 'undefined' ? SA_KPI[mode === 'institutional' ? 'inst' : 'retail'] : null;
    if (!kpis) return;
    document.querySelectorAll('[data-kpi]').forEach(el => {
      const key = el.dataset.kpi;
      const kpi = kpis[key];
      if (!kpi) return;
      el.dataset.count   = kpi.val;
      el.dataset.suffix  = kpi.suffix || '';
      el.dataset.prefix  = kpi.neg ? '−' : '';
      el.dataset.decimals= String(kpi.val).includes('.') ? '2' : '0';
      if (kpi.fmt) el.dataset.fmt = kpi.fmt;
      el.textContent = kpi.fmt || ((kpi.neg ? '−' : '') + kpi.val + (kpi.suffix || ''));
    });
    document.querySelectorAll('[data-kpi-label]').forEach(el => {
      const key = el.dataset.kpiLabel;
      const kpi = kpis[key];
      if (kpi) el.textContent = kpi.label;
    });
    document.querySelectorAll('[data-kpi-sub]').forEach(el => {
      const key = el.dataset.kpiSub;
      const kpi = kpis[key];
      if (kpi) el.textContent = kpi.sub;
    });
    document.querySelectorAll('[data-kpi-cell]').forEach(el => {
      const key = el.dataset.kpiCell;
      const kpi = kpis[key];
      if (kpi) el.textContent = kpi.fmt || kpi.val;
    });
    // Build annual returns tables dynamically
    if (typeof SA_ANNUAL !== 'undefined') {
      const modeKey = mode === 'institutional' ? 'inst' : 'retail';
      const tbody = document.getElementById('annual-tbody-' + modeKey);
      if (tbody) tbody.innerHTML = this._buildAnnualRows(SA_ANNUAL[modeKey]);
    }
  },

  /* ── Annual returns table builder ───────────────────────── */
  _buildAnnualRows(data) {
    if (!data || !data.length) return '';
    const fmt = (v, dec) => {
      const abs = Math.abs(v).toLocaleString('de-DE', {
        minimumFractionDigits: dec, maximumFractionDigits: dec
      });
      return (v >= 0 ? '+' : '−') + abs + ' %';
    };
    const cls = (v) => v >= 0 ? 'pos' : 'neg';
    return data.map((r, i) => {
      const isLast = i === data.length - 1;
      const year   = r.y + (isLast ? '*' : '');
      const diff   = Math.round((r.p - r.b) * 10) / 10;
      const style  = isLast ? ' style="background:#F7F5F2;"' : '';
      return `<tr class="year-row"${style}><td>${year}</td><td class="${cls(r.p)}">${fmt(r.p, 2)}</td><td class="${cls(r.b)}">${fmt(r.b, 1)}</td><td class="${cls(diff)}">${fmt(diff, 1)}</td></tr>`;
    }).join('\n            ');
  },

  /* ── Counters ───────────────────────────────────────────── */
  _counters() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { this._animateCounter(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
  },

  _runCounters() {
    document.querySelectorAll('[data-count]').forEach(el => this._animateCounter(el));
  },

  _animateCounter(el) {
    const target   = parseFloat(el.dataset.count);
    const suffix   = el.dataset.suffix  || '';
    const prefix   = el.dataset.prefix  || '';
    const decimals = parseInt(el.dataset.decimals) || 0;
    const dur      = 1400;
    const start    = performance.now();
    const tick = (now) => {
      const t    = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const sep  = (v) => v.toLocaleString('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      if (t >= 1 && el.dataset.fmt) {
        el.textContent = el.dataset.fmt;
      } else {
        el.textContent = prefix + sep(target * ease) + suffix;
      }
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  /* ── Nav scroll state ───────────────────────────────────── */
  _navScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const fn = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
  },

  /* ── Mobile hamburger ───────────────────────────────────── */
  _hamburger() {
    const btn    = document.querySelector('.nav-hamburger');
    const mobile = document.querySelector('.nav-mobile');
    if (!btn || !mobile) return;
    btn.addEventListener('click', () => {
      const open = mobile.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    mobile.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobile.classList.remove('open'));
    });
  },

  /* ── Active nav link ────────────────────────────────────── */
  _activeLinks() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
      if ((a.getAttribute('href') || '').endsWith(path)) a.classList.add('active');
    });
  },

  /* ── Scroll reveal ──────────────────────────────────────── */
  _scrollReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
  }
};

document.addEventListener('DOMContentLoaded', () => SA.init());
