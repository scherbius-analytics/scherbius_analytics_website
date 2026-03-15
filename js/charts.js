/* ============================================================
   Scherbius Analytics — Chart.js Initialization
   Interactive equity curves with draw animation + zoom/pan
   + Highcharts-style range navigator
   Depends on: chartdata.js, Chart.js CDN, chartjs-plugin-zoom
   ============================================================ */

/* ── Color constants ────────────────────────────────────────── */
const C_SA   = '#B91C1C';
const C_SA_A = 'rgba(185,28,28,0.08)';
const C_NDX  = '#9CA3AF';
const C_NDX_A= 'rgba(156,163,175,0.08)';
const C_GRID = '#F0EDE8';

/* ── Shared Chart.js defaults ───────────────────────────────── */
Chart.defaults.font.family = "'Outfit', sans-serif";
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#9CA3AF';

/* ── Helper: format numbers ─────────────────────────────────── */
function fmtVal(v) {
  if (v >= 100000) return (v/1000).toFixed(0) + 'k';
  if (v >= 10000)  return (v/1000).toFixed(1) + 'k';
  return v.toLocaleString('de-DE', {maximumFractionDigits:0});
}

/* ── Build equity curve chart ───────────────────────────────── */
function buildEquityChart(canvasId, rawData, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels    = rawData.map(r => r.d);
  const portData  = rawData.map(r => r.p);
  const benchData = rawData.map(r => r.b);

  const portLabel  = opts.portLabel  || 'Scherbius Portfolio';
  const benchLabel = opts.benchLabel || 'NASDAQ-100 (Benchmark)';

  // Start with 0 points — will animate progressively
  let drawn = 0;
  const STEPS = 80;
  const step  = Math.max(1, Math.ceil(rawData.length / STEPS));

  const cfg = {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: portLabel,
          data: [],
          borderColor: C_SA,
          backgroundColor: C_SA_A,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: C_SA,
          fill: true,
          tension: 0.3,
        },
        {
          label: benchLabel,
          data: [],
          borderColor: C_NDX,
          backgroundColor: C_NDX_A,
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C_NDX,
          fill: false,
          tension: 0.3,
          borderDash: [4, 3],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 14,
            boxHeight: 2,
            padding: 20,
            usePointStyle: false,
            font: { size: 11, weight: '500' },
          }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleColor: 'rgba(255,255,255,0.5)',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 10, weight: '600' },
          bodyFont: { size: 13 },
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => {
              const val = item.raw;
              const pct = ((val / 10000 - 1) * 100).toFixed(1);
              return ` ${item.dataset.label}: ${fmtVal(val)} € (+${pct}%)`;
            }
          }
        },
        zoom: {
          zoom: {
            wheel: { enabled: true, speed: 0.1 },
            pinch: { enabled: true },
            mode: 'x',
            onZoom: ({ chart }) => { if (chart._navSyncFn) chart._navSyncFn(); }
          },
          pan: {
            enabled: true,
            mode: 'x',
            onPan: ({ chart }) => { if (chart._navSyncFn) chart._navSyncFn(); }
          },
          limits: {
            x: { minRange: 30 }
          }
        }
      },
      scales: {
        x: {
          grid: { color: C_GRID, drawBorder: false },
          ticks: {
            maxTicksLimit: 8,
            maxRotation: 0,
            color: '#9CA3AF',
            font: { size: 10 },
            callback: (val, i, ticks) => {
              const lbl = labels[i] || '';
              return lbl.substring(0, 7); // "2022-03"
            }
          },
          border: { display: false }
        },
        y: {
          grid: { color: C_GRID, drawBorder: false },
          ticks: {
            color: '#9CA3AF',
            font: { size: 10 },
            callback: (v) => fmtVal(v) + ' €'
          },
          border: { display: false }
        }
      }
    }
  };

  const chart = new Chart(canvas, cfg);

  // Progressive draw animation
  function drawStep() {
    drawn = Math.min(drawn + step, rawData.length);
    chart.data.labels        = labels.slice(0, drawn);
    chart.data.datasets[0].data = portData.slice(0, drawn);
    chart.data.datasets[1].data = benchData.slice(0, drawn);
    chart.update('none');
    if (drawn < rawData.length) requestAnimationFrame(drawStep);
  }

  // Trigger when visible
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      drawStep();
      io.disconnect();
    }
  }, { threshold: 0.1 });
  io.observe(canvas);

  // Reset zoom button
  const resetBtn = document.getElementById(canvasId + '-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      chart.resetZoom();
      if (chart._navSyncFn) chart._navSyncFn();
    });
  }

  return chart;
}

/* ── Build annual bar chart ─────────────────────────────────── */
function buildAnnualChart(canvasId, annualData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels = annualData.map(r => r.y === 2026 ? '2026*' : String(r.y));
  const portVals = annualData.map(r => r.p);
  const benchVals = annualData.map(r => r.b);

  const portColors  = portVals.map(v => v >= 0 ? C_SA : '#FCA5A5');
  const benchColors = benchVals.map(v => v >= 0 ? '#D1D5DB' : '#E5E7EB');

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Scherbius',
          data: portVals,
          backgroundColor: portColors,
          borderRadius: 2,
          borderSkipped: false,
        },
        {
          label: 'NASDAQ-100',
          data: benchVals,
          backgroundColor: benchColors,
          borderRadius: 2,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top', align: 'end',
          labels: { boxWidth: 12, boxHeight: 2, padding: 20, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleColor: 'rgba(255,255,255,0.5)',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (item) => {
              const v = item.raw;
              return ` ${item.dataset.label}: ${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9CA3AF', font: { size: 10 } },
          border: { display: false }
        },
        y: {
          grid: { color: C_GRID, drawBorder: false },
          ticks: {
            color: '#9CA3AF', font: { size: 10 },
            callback: (v) => (v >= 0 ? '+' : '') + v + '%'
          },
          border: { display: false }
        }
      }
    }
  });
}

/* ── Range Navigator ────────────────────────────────────────── */
/*
 * buildNavigator(mainChart, wrapId, initialData)
 *   mainChart   – the Chart.js instance to control
 *   wrapId      – id of the .chart-nav-wrap element
 *   initialData – array of {d, p, b}
 *
 * Returns an object with:
 *   syncFromMain()     – read current zoom state → update handles
 *   updateData(data)   – replace data (mode switch) + reset
 */
function buildNavigator(mainChart, wrapId, initialData) {
  const wrap  = document.getElementById(wrapId);
  if (!wrap) return null;

  const navCanvas = wrap.querySelector('canvas');
  const maskL     = wrap.querySelector('.chart-nav-mask-l');
  const maskR     = wrap.querySelector('.chart-nav-mask-r');
  const sel       = wrap.querySelector('.chart-nav-sel');
  const hl        = wrap.querySelector('.chart-nav-hl');
  const hr        = wrap.querySelector('.chart-nav-hr');

  let data = initialData;
  let n    = data.length;

  // ── Mini chart (no axes, no tooltips, no interactions) ──────
  const miniCfg = {
    type: 'line',
    data: {
      labels: data.map(r => r.d),
      datasets: [
        {
          data: data.map(r => r.p),
          borderColor: C_SA,
          borderWidth: 1.5,
          pointRadius: 0,
          fill: { target: 'origin', above: C_SA_A },
          tension: 0.3,
        },
        {
          data: data.map(r => r.b),
          borderColor: C_NDX,
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          borderDash: [3, 2],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      events: [],            // no mouse events on mini chart itself
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        zoom: { zoom: { wheel: { enabled: false } }, pan: { enabled: false } }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  };
  const mini = new Chart(navCanvas, miniCfg);

  // ── Selection state (fraction 0..1) ─────────────────────────
  let selL = 0;   // left edge fraction
  let selR = 1;   // right edge fraction

  function applySelection() {
    const W = wrap.offsetWidth;
    const lPx = selL * W;
    const rPx = selR * W;

    maskL.style.width = lPx + 'px';
    maskR.style.width = (W - rPx) + 'px';
    sel.style.left    = lPx + 'px';
    sel.style.width   = (rPx - lPx) + 'px';
  }

  function fractionToIndex(f) {
    return Math.round(f * (n - 1));
  }

  function applyToMain() {
    const iL = fractionToIndex(selL);
    const iR = fractionToIndex(selR);
    if (!mainChart.scales.x) return;
    // zoomScale() is programmatic and does NOT fire onZoom, so no re-entrancy risk
    mainChart.zoomScale('x', { min: iL, max: iR }, 'none');
  }

  // ── Sync navigator from main chart zoom state ───────────────
  function syncFromMain() {
    const xScale = mainChart.scales.x;
    if (!xScale || !mainChart.data.labels.length) return;
    const total = n - 1;
    selL = Math.max(0, (xScale.min ?? 0) / total);
    selR = Math.min(1, (xScale.max ?? total) / total);
    applySelection();
  }

  // ── Drag logic ───────────────────────────────────────────────
  const MIN_FRAC = 30 / Math.max(n, 31); // mirrors limits.x.minRange=30

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function startDrag(e, mode) {
    // mode: 'sel' | 'hl' | 'hr'
    e.preventDefault();
    const W   = wrap.offsetWidth;
    const startX = (e.touches ? e.touches[0].clientX : e.clientX);
    const startL = selL;
    const startR = selR;

    function onMove(ev) {
      const cx  = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      const dx  = (cx - startX) / W;

      if (mode === 'sel') {
        const w  = startR - startL;
        selL = clamp(startL + dx, 0, 1 - w);
        selR = selL + w;
      } else if (mode === 'hl') {
        selL = clamp(startL + dx, 0, selR - MIN_FRAC);
      } else {
        selR = clamp(startR + dx, selL + MIN_FRAC, 1);
      }
      applySelection();
      applyToMain();
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend',  onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend',  onUp);
  }

  // Click on masked area → jump selection center to that point
  wrap.addEventListener('mousedown', (e) => {
    if (e.target.closest('.chart-nav-sel')) return; // handled by sel/hl/hr listeners
    e.preventDefault();
    const W  = wrap.offsetWidth;
    const cx = e.clientX - wrap.getBoundingClientRect().left;
    const f  = clamp(cx / W, 0, 1);
    const hw = (selR - selL) / 2;
    selL = clamp(f - hw, 0, 1 - (selR - selL));
    selR = selL + (selR - selL);
    applySelection();
    applyToMain();
  });

  sel.addEventListener('mousedown',  (e) => startDrag(e, 'sel'));
  sel.addEventListener('touchstart', (e) => startDrag(e, 'sel'), { passive: false });
  hl.addEventListener('mousedown',   (e) => { e.stopPropagation(); startDrag(e, 'hl'); });
  hl.addEventListener('touchstart',  (e) => { e.stopPropagation(); startDrag(e, 'hl'); }, { passive: false });
  hr.addEventListener('mousedown',   (e) => { e.stopPropagation(); startDrag(e, 'hr'); });
  hr.addEventListener('touchstart',  (e) => { e.stopPropagation(); startDrag(e, 'hr'); }, { passive: false });

  // ── Initial render ───────────────────────────────────────────
  applySelection();

  // ── Public API ───────────────────────────────────────────────
  return {
    syncFromMain,

    updateData(newData) {
      data = newData;
      n    = data.length;
      mini.data.labels           = data.map(r => r.d);
      mini.data.datasets[0].data = data.map(r => r.p);
      mini.data.datasets[1].data = data.map(r => r.b);
      mini.update('none');
      // reset selection to full range
      selL = 0; selR = 1;
      applySelection();
      mainChart.resetZoom();
      mainChart._navSyncFn = syncFromMain;
    }
  };
}

/* ── Cash / Investitionsquote Chart ─────────────────────────── */
function buildCashInvChart(canvasId, rawData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels   = rawData.map(r => r.d);
  const invData  = rawData.map(r => r.inv);
  const cashData = rawData.map(r => r.cash);

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Investiert (%)',
          data: invData,
          borderColor: '#047857',
          backgroundColor: 'rgba(4,120,87,0.15)',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.2,
          order: 1,
        },
        {
          label: 'Cash (%)',
          data: cashData,
          borderColor: '#9CA3AF',
          backgroundColor: 'rgba(156,163,175,0.12)',
          borderWidth: 1,
          pointRadius: 0,
          fill: true,
          tension: 0.2,
          order: 2,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top', align: 'end',
          labels: { boxWidth: 12, boxHeight: 2, padding: 20, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleColor: 'rgba(255,255,255,0.5)',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ${item.raw.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#9CA3AF', font: { size: 10 },
            maxTicksLimit: 12,
            maxRotation: 0,
          },
          border: { display: false }
        },
        y: {
          min: 0, max: 100,
          grid: { color: C_GRID },
          ticks: {
            color: '#9CA3AF', font: { size: 10 },
            callback: (v) => v + '%',
            stepSize: 25,
          },
          border: { display: false }
        }
      }
    }
  });
}

/* ── Live performance chart (since inception, cumulative %) ─── */
function buildLiveChart(canvasId, rawData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels   = rawData.map(r => r.d);
  const portData = rawData.map(r => r.port);
  const ndxData  = rawData.map(r => r.ndx);

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Portfolio',
          data: portData,
          borderColor: '#D97706',
          backgroundColor: 'rgba(217,119,6,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#D97706',
          fill: false,
          tension: 0.2,
        },
        {
          label: 'NASDAQ-100',
          data: ndxData,
          borderColor: '#059669',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#059669',
          fill: false,
          tension: 0.2,
          borderDash: [4, 3],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top', align: 'end',
          labels: { boxWidth: 12, boxHeight: 2, padding: 20, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleColor: 'rgba(255,255,255,0.5)',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (item) => {
              const v = item.raw;
              return ` ${item.dataset.label}: ${v >= 0 ? '+' : ''}${v.toFixed(2).replace('.', ',')} %`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#9CA3AF', font: { size: 10 },
            maxTicksLimit: 10, maxRotation: 0,
            callback: (val, i) => {
              const lbl = labels[i] || '';
              return lbl.substring(5); // show MM-DD
            }
          },
          border: { display: false }
        },
        y: {
          grid: { color: C_GRID, drawBorder: false },
          ticks: {
            color: '#9CA3AF', font: { size: 10 },
            callback: (v) => (v >= 0 ? '+' : '') + v.toFixed(1) + ' %'
          },
          border: { display: false }
        }
      }
    }
  });
}

/* ── Drawdown comparison chart ──────────────────────────────── */
function buildDrawdownChart(canvasId, rawData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels   = rawData.map(r => r.d);
  const portData = rawData.map(r => r.port);
  const ndxData  = rawData.map(r => r.ndx);

  const allVals = portData.concat(ndxData).filter(v => v !== null && v !== undefined);
  const dataMin = Math.min(...allVals);
  const yMin    = Math.floor((dataMin - 5) / 5) * 5; // round down to next 5%

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Scherbius Portfolio',
          data: portData,
          borderColor: C_SA,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: C_SA,
          fill: false,
          tension: 0.2,
        },
        {
          label: 'NASDAQ-100',
          data: ndxData,
          borderColor: C_NDX,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: C_NDX,
          fill: false,
          tension: 0.2,
          borderDash: [4, 3],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top', align: 'end',
          labels: { boxWidth: 12, boxHeight: 2, padding: 20, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: '#1A1A1A',
          titleColor: 'rgba(255,255,255,0.5)',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (item) => {
              const v = item.raw;
              return ` ${item.dataset.label}: ${v.toFixed(2).replace('.', ',')} %`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#9CA3AF', font: { size: 10 },
            maxTicksLimit: 8, maxRotation: 0,
            callback: (val, i) => {
              const lbl = labels[i] || '';
              return lbl.substring(0, 7);
            }
          },
          border: { display: false }
        },
        y: {
          min: yMin,
          max: 0,
          grid: { color: C_GRID, drawBorder: false },
          ticks: {
            color: '#9CA3AF', font: { size: 10 },
            callback: (v) => v.toFixed(0) + ' %'
          },
          border: { display: false }
        }
      }
    }
  });
}

/* ── Mode-aware chart manager ───────────────────────────────── */
const SA_Charts = {
  eq:        null,
  annual:    null,
  cashInv:   null,
  cashInvI:  null,
  drawdown:  null,
  liveChart: null,
  _nav:      null,

  init(mode = 'retail') {
    const isInst   = mode === 'institutional';
    const eqData   = isInst ? SA_INST_EQ    : SA_RETAIL_EQ;
    const ddData   = isInst ? SA_INST_DD    : SA_RETAIL_DD;
    const annData  = isInst ? SA_ANNUAL.inst : SA_ANNUAL.retail;
    const liveData = isInst ? SA_INST_LIVE  : SA_RETAIL_LIVE;
    const portLabel = isInst ? 'Scherbius 1.0 Institutionell' : 'Scherbius 1.0 Privatanleger';

    this.eq     = buildEquityChart('eq-chart', eqData, { portLabel, benchLabel: 'NASDAQ-100' });
    this.annual = buildAnnualChart('annual-chart', annData);

    if (this.eq) {
      this._nav = buildNavigator(this.eq, 'eq-chart-nav-wrap', eqData);
      if (this._nav) this.eq._navSyncFn = this._nav.syncFromMain.bind(this._nav);
    }

    if (typeof SA_CASH_INV !== 'undefined') {
      this.cashInv  = buildCashInvChart('cash-inv-chart', SA_CASH_INV);
      this.cashInvI = buildCashInvChart('cash-inv-chart-inst', SA_CASH_INV);
    }

    if (typeof SA_RETAIL_DD !== 'undefined') {
      this.drawdown = buildDrawdownChart('dd-chart', ddData);
    }

    if (typeof SA_RETAIL_LIVE !== 'undefined') {
      this.liveChart = buildLiveChart('live-chart', liveData);
    }
  },

  switchMode(mode) {
    const isInst = mode === 'institutional';
    const eqData     = isInst ? SA_INST_EQ   : SA_RETAIL_EQ;
    const annualData = isInst ? SA_ANNUAL.inst : SA_ANNUAL.retail;
    const portLabel  = isInst ? 'Scherbius 1.0 Institutionell' : 'Scherbius 1.0 Privatanleger';

    if (this.eq) {
      // Re-animate with new data
      const labels    = eqData.map(r => r.d);
      const portData  = eqData.map(r => r.p);
      const benchData = eqData.map(r => r.b);
      const STEPS = 60;
      const stepSz = Math.max(1, Math.ceil(eqData.length / STEPS));
      let drawn = 0;

      this.eq.data.datasets[0].label = portLabel;
      this.eq.resetZoom && this.eq.resetZoom();

      const animate = () => {
        drawn = Math.min(drawn + stepSz, eqData.length);
        this.eq.data.labels = labels.slice(0, drawn);
        this.eq.data.datasets[0].data = portData.slice(0, drawn);
        this.eq.data.datasets[1].data = benchData.slice(0, drawn);
        this.eq.update('none');
        if (drawn < eqData.length) requestAnimationFrame(animate);
      };
      animate();
    }

    if (this._nav) {
      this._nav.updateData(eqData);
      this.eq._navSyncFn = this._nav.syncFromMain.bind(this._nav);
    }

    if (this.annual) {
      const portColors = annualData.map(r => r.p >= 0 ? C_SA : '#FCA5A5');
      this.annual.data.labels = annualData.map(r => r.y === 2026 ? '2026*' : String(r.y));
      this.annual.data.datasets[0].data = annualData.map(r => r.p);
      this.annual.data.datasets[0].backgroundColor = portColors;
      this.annual.data.datasets[1].data = annualData.map(r => r.b);
      this.annual.update();
    }

    if (this.drawdown && typeof SA_RETAIL_DD !== 'undefined' && typeof SA_INST_DD !== 'undefined') {
      const ddData = isInst ? SA_INST_DD : SA_RETAIL_DD;
      const allVals = ddData.map(r => r.port).concat(ddData.map(r => r.ndx));
      const dataMin = Math.min(...allVals);
      const yMin    = Math.floor((dataMin - 5) / 5) * 5;
      this.drawdown.data.labels = ddData.map(r => r.d);
      this.drawdown.data.datasets[0].data = ddData.map(r => r.port);
      this.drawdown.data.datasets[1].data = ddData.map(r => r.ndx);
      this.drawdown.options.scales.y.min = yMin;
      this.drawdown.update();
    }

    if (this.liveChart && typeof SA_RETAIL_LIVE !== 'undefined' && typeof SA_INST_LIVE !== 'undefined') {
      const liveData = isInst ? SA_INST_LIVE : SA_RETAIL_LIVE;
      this.liveChart.data.labels = liveData.map(r => r.d);
      this.liveChart.data.datasets[0].data = liveData.map(r => r.port);
      this.liveChart.data.datasets[1].data = liveData.map(r => r.ndx);
      this.liveChart.update();
    }
  }
};
