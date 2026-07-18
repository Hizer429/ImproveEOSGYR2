// ==UserScript==
// @name         CUT Compliance Helper
// @namespace    eos.cut.helper
// @version      0.1.0
// @description  Read-only CUT compliance calculator for QuickSight baseline + Quip closed ISA lists.
// @author       EOS
// @match        https://*.amazon.com/*
// @match        https://*.amazon.dev/*
// @match        https://quip-amazon.com/*
// @match        https://*.quip-amazon.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'cut-helper-state-v1';
  const CATEGORY = {
    CURRENT: 'current',
    PAST: 'past',
    FUTURE: 'future'
  };

  const defaultState = {
    target: 85,
    baselineText: [
      'ISA111 Current Due',
      'ISA222 Past Due',
      'ISA333 Future Due'
    ].join('\n'),
    processedText: [
      'ISA111',
      'ISA333'
    ].join('\n'),
    collapsed: false
  };

  const savedState = safeJsonParse(GM_getValue(STORAGE_KEY, ''), defaultState);
  const state = { ...defaultState, ...savedState };

  const styles = document.createElement('style');
  styles.textContent = `
    #cut-helper-root {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      width: min(780px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      font-family: Arial, Helvetica, sans-serif;
      color: #17202a;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
      border: 1px solid #9aa4b2;
      background: #f7f9fb;
    }

    #cut-helper-root * {
      box-sizing: border-box;
      letter-spacing: 0;
    }

    .cut-helper-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      color: #fff;
      background: #1f2937;
      border-bottom: 3px solid #f0b429;
      cursor: move;
      user-select: none;
    }

    .cut-helper-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .cut-helper-title strong {
      font-size: 14px;
      line-height: 1.2;
    }

    .cut-helper-title span {
      color: #d5dce6;
      font-size: 11px;
      line-height: 1.2;
    }

    .cut-helper-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
    }

    .cut-helper-icon-btn {
      width: 30px;
      height: 30px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }

    .cut-helper-body {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(280px, 1fr);
      gap: 12px;
      padding: 12px;
      overflow: auto;
      max-height: calc(100vh - 92px);
    }

    .cut-helper-root-collapsed .cut-helper-body {
      display: none;
    }

    .cut-helper-panel {
      border: 1px solid #c7d0dc;
      background: #fff;
      padding: 10px;
    }

    .cut-helper-panel h3 {
      margin: 0 0 8px;
      font-size: 13px;
      color: #263445;
    }

    .cut-helper-panel p {
      margin: 0 0 8px;
      color: #5d6875;
      font-size: 11px;
      line-height: 1.35;
    }

    .cut-helper-textarea {
      width: 100%;
      height: 138px;
      resize: vertical;
      border: 1px solid #aeb8c5;
      padding: 8px;
      font-family: Consolas, Monaco, monospace;
      font-size: 12px;
      line-height: 1.35;
      color: #17202a;
      background: #fbfcfe;
    }

    .cut-helper-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 8px 0 0;
    }

    .cut-helper-btn,
    .cut-helper-target {
      min-height: 30px;
      border: 1px solid #aeb8c5;
      padding: 5px 9px;
      background: #eef3f8;
      color: #1f2937;
      font-size: 12px;
      cursor: pointer;
    }

    .cut-helper-btn:hover,
    .cut-helper-target:hover {
      background: #dce7f2;
    }

    .cut-helper-target.active {
      border-color: #0073bb;
      color: #fff;
      background: #0073bb;
    }

    .cut-helper-custom-target {
      width: 68px;
      min-height: 30px;
      border: 1px solid #aeb8c5;
      padding: 5px 7px;
      font-size: 12px;
    }

    .cut-helper-results {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .cut-helper-metric {
      border: 1px solid #d5dde7;
      background: #f8fafc;
      padding: 9px;
      min-height: 64px;
    }

    .cut-helper-metric span {
      display: block;
      color: #607080;
      font-size: 11px;
      line-height: 1.2;
    }

    .cut-helper-metric strong {
      display: block;
      margin-top: 5px;
      color: #111827;
      font-size: 22px;
      line-height: 1.1;
    }

    .cut-helper-metric.good strong { color: #0b7a42; }
    .cut-helper-metric.warn strong { color: #a15c00; }
    .cut-helper-metric.bad strong { color: #b42318; }

    .cut-helper-recommendation {
      margin-top: 10px;
      border-left: 5px solid #0073bb;
      background: #eef7ff;
      padding: 9px 10px;
      color: #1f2937;
      font-size: 12px;
      line-height: 1.4;
    }

    .cut-helper-recommendation.bad {
      border-left-color: #b42318;
      background: #fff1f0;
    }

    .cut-helper-recommendation.good {
      border-left-color: #0b7a42;
      background: #eefaf3;
    }

    .cut-helper-table {
      width: 100%;
      margin-top: 10px;
      border-collapse: collapse;
      font-size: 12px;
    }

    .cut-helper-table th,
    .cut-helper-table td {
      border-bottom: 1px solid #e0e6ee;
      padding: 6px 4px;
      text-align: right;
      white-space: nowrap;
    }

    .cut-helper-table th:first-child,
    .cut-helper-table td:first-child {
      text-align: left;
    }

    .cut-helper-unmatched {
      max-height: 82px;
      overflow: auto;
      margin-top: 8px;
      border: 1px solid #ead5a7;
      background: #fff9ed;
      padding: 7px;
      color: #6b4e16;
      font-family: Consolas, Monaco, monospace;
      font-size: 11px;
      line-height: 1.35;
    }

    @media (max-width: 720px) {
      .cut-helper-body {
        grid-template-columns: 1fr;
      }

      .cut-helper-results {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(styles);

  const root = document.createElement('div');
  root.id = 'cut-helper-root';
  root.className = state.collapsed ? 'cut-helper-root-collapsed' : '';
  root.innerHTML = `
    <div class="cut-helper-header" data-drag-handle>
      <div class="cut-helper-title">
        <strong>CUT Compliance Helper</strong>
        <span>QuickSight baseline + Quip closed ISA list</span>
      </div>
      <div class="cut-helper-actions">
        <button class="cut-helper-icon-btn" id="cut-helper-collapse" title="Collapse or expand">-</button>
      </div>
    </div>
    <div class="cut-helper-body">
      <div class="cut-helper-panel">
        <h3>QuickSight Baseline</h3>
        <p>Paste ISA rows from the shift snapshot. Each line should include the ISA plus Current, Past, or Future.</p>
        <textarea id="cut-baseline-input" class="cut-helper-textarea" spellcheck="false"></textarea>
        <div class="cut-helper-controls">
          <button class="cut-helper-btn" id="cut-load-sample">Sample</button>
          <button class="cut-helper-btn" id="cut-clear-inputs">Clear</button>
        </div>
      </div>
      <div class="cut-helper-panel">
        <h3>Quip Closed ISAs</h3>
        <p>Paste closed/processed ISAs from Quip. Categories are matched from the QuickSight baseline.</p>
        <textarea id="cut-processed-input" class="cut-helper-textarea" spellcheck="false"></textarea>
        <div class="cut-helper-controls" id="cut-target-controls">
          <button class="cut-helper-target" data-target="85">85%</button>
          <button class="cut-helper-target" data-target="90">90%</button>
          <button class="cut-helper-target" data-target="95">95%</button>
          <input class="cut-helper-custom-target" id="cut-custom-target" type="number" min="1" max="100" step="0.1" title="Custom target percentage">
        </div>
      </div>
      <div class="cut-helper-panel">
        <h3>Compliance</h3>
        <div class="cut-helper-results" id="cut-results"></div>
        <div id="cut-recommendation" class="cut-helper-recommendation"></div>
      </div>
      <div class="cut-helper-panel">
        <h3>Breakdown</h3>
        <table class="cut-helper-table" id="cut-breakdown"></table>
        <div id="cut-unmatched"></div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const els = {
    baseline: root.querySelector('#cut-baseline-input'),
    processed: root.querySelector('#cut-processed-input'),
    results: root.querySelector('#cut-results'),
    breakdown: root.querySelector('#cut-breakdown'),
    recommendation: root.querySelector('#cut-recommendation'),
    unmatched: root.querySelector('#cut-unmatched'),
    customTarget: root.querySelector('#cut-custom-target'),
    collapse: root.querySelector('#cut-helper-collapse')
  };

  els.baseline.value = state.baselineText;
  els.processed.value = state.processedText;
  els.customTarget.value = state.target;
  syncTargetButtons();
  render();

  els.baseline.addEventListener('input', updateFromInputs);
  els.processed.addEventListener('input', updateFromInputs);
  els.customTarget.addEventListener('input', () => {
    state.target = clampNumber(parseFloat(els.customTarget.value), 1, 100, 85);
    syncTargetButtons();
    persistAndRender();
  });

  root.querySelector('#cut-target-controls').addEventListener('click', (event) => {
    const button = event.target.closest('[data-target]');
    if (!button) return;
    state.target = parseFloat(button.dataset.target);
    els.customTarget.value = state.target;
    syncTargetButtons();
    persistAndRender();
  });

  root.querySelector('#cut-load-sample').addEventListener('click', () => {
    els.baseline.value = [
      'ISA001 Current Due',
      'ISA002 Current Due',
      'ISA003 Past Due',
      'ISA004 Future Due',
      'ISA005 Future Due'
    ].join('\n');
    els.processed.value = [
      'ISA001',
      'ISA004'
    ].join('\n');
    updateFromInputs();
  });

  root.querySelector('#cut-clear-inputs').addEventListener('click', () => {
    els.baseline.value = '';
    els.processed.value = '';
    updateFromInputs();
  });

  els.collapse.addEventListener('click', () => {
    state.collapsed = !state.collapsed;
    root.classList.toggle('cut-helper-root-collapsed', state.collapsed);
    els.collapse.textContent = state.collapsed ? '+' : '-';
    persist();
  });
  els.collapse.textContent = state.collapsed ? '+' : '-';

  makeDraggable(root, root.querySelector('[data-drag-handle]'));

  function updateFromInputs() {
    state.baselineText = els.baseline.value;
    state.processedText = els.processed.value;
    persistAndRender();
  }

  function persistAndRender() {
    persist();
    render();
  }

  function persist() {
    GM_setValue(STORAGE_KEY, JSON.stringify(state));
  }

  function render() {
    const parsed = parseInputs(state.baselineText, state.processedText);
    const metrics = calculateCompliance(parsed);
    const projection = calculateSafeFuture(metrics, state.target);
    const targetClass = metrics.compliance >= state.target ? 'good' : metrics.compliance >= state.target - 5 ? 'warn' : 'bad';

    els.results.innerHTML = [
      metricCard('CUT Compliance', `${formatPercent(metrics.compliance)}%`, targetClass),
      metricCard('Safe Future-Due', projection.safeFutureLabel, projection.safeFuture > 0 ? 'good' : 'bad'),
      metricCard('Processed', metrics.totalProcessed.toString(), ''),
      metricCard('Target', `${formatPercent(state.target)}%`, '')
    ].join('');

    els.breakdown.innerHTML = `
      <thead>
        <tr>
          <th>Category</th>
          <th>Pool</th>
          <th>Required</th>
          <th>Processed</th>
          <th>Missed</th>
          <th>Remaining</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Current Due</td>
          <td>${metrics.currentPool}</td>
          <td>${metrics.dueRequired}</td>
          <td>${metrics.currentProcessed}</td>
          <td>${metrics.missedCurrent}</td>
          <td>${Math.max(0, metrics.currentPool - metrics.currentProcessed)}</td>
        </tr>
        <tr>
          <td>Past Due</td>
          <td>${metrics.pastPool}</td>
          <td>${metrics.pastRequired}</td>
          <td>${metrics.pastProcessed}</td>
          <td>${metrics.missedPast}</td>
          <td>${Math.max(0, metrics.pastPool - metrics.pastProcessed)}</td>
        </tr>
        <tr>
          <td>Future Due</td>
          <td>${metrics.futurePool}</td>
          <td>0</td>
          <td>${metrics.futureProcessed}</td>
          <td>0</td>
          <td>${Math.max(0, metrics.futurePool - metrics.futureProcessed)}</td>
        </tr>
      </tbody>
    `;

    els.recommendation.className = `cut-helper-recommendation ${targetClass}`;
    els.recommendation.textContent = buildRecommendation(metrics, projection, state.target);

    if (parsed.unmatched.length > 0) {
      els.unmatched.innerHTML = `
        <div class="cut-helper-unmatched">
          Unmatched processed ISAs not counted: ${parsed.unmatched.join(', ')}
        </div>
      `;
    } else {
      els.unmatched.innerHTML = '';
    }
  }

  function parseInputs(baselineText, processedText) {
    const baseline = new Map();
    const baselineRows = splitRows(baselineText);
    const processedRows = splitRows(processedText);

    baselineRows.forEach((line) => {
      const isa = extractIsa(line);
      const category = extractCategory(line);
      if (isa && category) {
        baseline.set(isa, category);
      }
    });

    const processed = [];
    const unmatched = [];
    const seen = new Set();

    processedRows.forEach((line) => {
      const isa = extractIsa(line);
      if (!isa || seen.has(isa)) return;
      seen.add(isa);

      const category = baseline.get(isa) || extractCategory(line);
      if (category) {
        processed.push({ isa, category });
      } else {
        unmatched.push(isa);
      }
    });

    return { baseline, processed, unmatched };
  }

  function calculateCompliance(parsed) {
    let currentPool = 0;
    let pastPool = 0;
    let futurePool = 0;
    let currentProcessed = 0;
    let pastProcessed = 0;
    let futureProcessed = 0;

    parsed.baseline.forEach((category) => {
      if (category === CATEGORY.CURRENT) currentPool += 1;
      if (category === CATEGORY.PAST) pastPool += 1;
      if (category === CATEGORY.FUTURE) futurePool += 1;
    });

    parsed.processed.forEach((row) => {
      if (row.category === CATEGORY.CURRENT) currentProcessed += 1;
      if (row.category === CATEGORY.PAST) pastProcessed += 1;
      if (row.category === CATEGORY.FUTURE) futureProcessed += 1;
    });

    return calculateFromCounts({
      currentPool,
      pastPool,
      futurePool,
      currentProcessed,
      pastProcessed,
      futureProcessed
    });
  }

  function calculateFromCounts(counts) {
    const totalProcessed = counts.currentProcessed + counts.pastProcessed + counts.futureProcessed;
    const dueRequired = Math.min(counts.currentPool, totalProcessed);
    const pastRequired = Math.min(counts.pastPool, Math.max(0, totalProcessed - dueRequired));
    const missedCurrent = Math.max(0, dueRequired - counts.currentProcessed);
    const missedPast = Math.max(0, pastRequired - counts.pastProcessed);
    const compliantProcessed = Math.max(0, totalProcessed - missedCurrent - missedPast);
    const compliance = totalProcessed === 0 ? 100 : (compliantProcessed / totalProcessed) * 100;

    return {
      ...counts,
      totalProcessed,
      dueRequired,
      pastRequired,
      missedCurrent,
      missedPast,
      compliantProcessed,
      compliance
    };
  }

  function calculateSafeFuture(metrics, target) {
    let safeFuture = 0;
    let capped = true;

    for (let add = 0; add <= 250; add += 1) {
      const projected = calculateFromCounts({
        currentPool: metrics.currentPool,
        pastPool: metrics.pastPool,
        futurePool: metrics.futurePool,
        currentProcessed: metrics.currentProcessed,
        pastProcessed: metrics.pastProcessed,
        futureProcessed: metrics.futureProcessed + add
      });

      if (projected.compliance >= target) {
        safeFuture = add;
        capped = add === 250;
      } else {
        capped = false;
        break;
      }
    }

    return {
      safeFuture,
      safeFutureLabel: capped ? `${safeFuture}+` : `${safeFuture}`,
      neededBeforeFuture: calculateNeededBeforeFuture(metrics, target)
    };
  }

  function calculateNeededBeforeFuture(metrics, target) {
    for (let needed = 0; needed <= metrics.currentPool + metrics.pastPool + 50; needed += 1) {
      const addCurrent = Math.min(needed, Math.max(0, metrics.currentPool - metrics.currentProcessed));
      const addPast = Math.max(0, needed - addCurrent);
      const projected = calculateFromCounts({
        currentPool: metrics.currentPool,
        pastPool: metrics.pastPool,
        futurePool: metrics.futurePool,
        currentProcessed: metrics.currentProcessed + addCurrent,
        pastProcessed: metrics.pastProcessed + addPast,
        futureProcessed: metrics.futureProcessed + 1
      });

      if (projected.compliance >= target) {
        return { total: needed, current: addCurrent, past: addPast };
      }
    }

    return { total: null, current: 0, past: 0 };
  }

  function buildRecommendation(metrics, projection, target) {
    if (metrics.totalProcessed === 0) {
      return 'Paste the QuickSight baseline and Quip closed ISA list to calculate compliance.';
    }

    if (projection.safeFuture > 0) {
      return `You are at ${formatPercent(metrics.compliance)}%. You can process ${projection.safeFutureLabel} more Future-Due trailer(s) and stay at or above ${formatPercent(target)}%.`;
    }

    if (metrics.compliance >= target && projection.safeFuture === 0) {
      return `You are at ${formatPercent(metrics.compliance)}%, but one more Future-Due trailer would drop you below ${formatPercent(target)}%. Hold Future-Due unless more Current/Past-Due work closes first.`;
    }

    const need = projection.neededBeforeFuture;
    if (need.total === null) {
      return `You are at ${formatPercent(metrics.compliance)}%. Process Current/Past-Due trailers before adding Future-Due work.`;
    }

    const parts = [];
    if (need.current > 0) parts.push(`${need.current} Current-Due`);
    if (need.past > 0) parts.push(`${need.past} Past-Due`);
    const detail = parts.length ? parts.join(' and ') : `${need.total} Current/Past-Due`;
    return `You are at ${formatPercent(metrics.compliance)}%. Process ${detail} trailer(s) before bringing in more Future-Due to protect ${formatPercent(target)}%.`;
  }

  function splitRows(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function extractIsa(line) {
    const text = String(line || '').toUpperCase();
    const isaMatch = text.match(/\bISA[-_:\s]*([A-Z0-9]{3,})\b/);
    if (isaMatch) return `ISA${isaMatch[1]}`;

    const looseMatch = text.match(/\b[A-Z]{0,4}\d{5,}\b|\b[A-Z0-9]{6,}\b/);
    return looseMatch ? looseMatch[0].replace(/[^A-Z0-9]/g, '') : null;
  }

  function extractCategory(line) {
    const text = String(line || '').toLowerCase();
    if (/\bpast[\s-]*due\b|\bpast\b|\bpd\b/.test(text)) return CATEGORY.PAST;
    if (/\bcurrent[\s-]*due\b|\bcurrent\b|\bdue\b|\bcd\b/.test(text)) return CATEGORY.CURRENT;
    if (/\bfuture[\s-]*due\b|\bfuture\b|\bfd\b/.test(text)) return CATEGORY.FUTURE;
    return null;
  }

  function syncTargetButtons() {
    root.querySelectorAll('[data-target]').forEach((button) => {
      const value = parseFloat(button.dataset.target);
      button.classList.toggle('active', Math.abs(value - state.target) < 0.001);
    });
  }

  function metricCard(label, value, className) {
    return `
      <div class="cut-helper-metric ${className || ''}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return '0';
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }

  function safeJsonParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function makeDraggable(element, handle) {
    let startX = 0;
    let startY = 0;
    let startRight = 0;
    let startBottom = 0;
    let dragging = false;

    handle.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startRight = parseFloat(getComputedStyle(element).right) || 16;
      startBottom = parseFloat(getComputedStyle(element).bottom) || 16;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(event) {
      if (!dragging) return;
      const nextRight = clampNumber(startRight - (event.clientX - startX), 0, window.innerWidth - 80, 16);
      const nextBottom = clampNumber(startBottom - (event.clientY - startY), 0, window.innerHeight - 60, 16);
      element.style.right = `${nextRight}px`;
      element.style.bottom = `${nextBottom}px`;
    }

    function onMouseUp() {
      dragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }
})();
