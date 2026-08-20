class PriceChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.priceData = [];
    this.exposureData = [];
  }

  setData(pricePoints, exposurePoints = []) {
    this.priceData = pricePoints;
    this.exposureData = exposurePoints;
    this.draw();
  }

  draw() {
    const { canvas, ctx, priceData, exposureData } = this;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 16, bottom: 52, left: 52 };
    const exposureH = 36;

    ctx.clearRect(0, 0, w, h);

    if (priceData.length < 2) {
      ctx.fillStyle = "#64748b";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("Price chart builds as you trade", pad.left, h / 2);
      return;
    }

    const prices = priceData.map((d) => d.price);
    const min = Math.min(...prices) * 0.98;
    const max = Math.max(...prices) * 1.02;
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom - exposureH;

    const x = (i) => pad.left + (i / (priceData.length - 1)) * chartW;
    const y = (p) => pad.top + chartH - ((p - min) / (max - min)) * chartH;

    // grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(w - pad.right, gy);
      ctx.stroke();
      const val = max - ((max - min) / 4) * i;
      ctx.fillStyle = "#64748b";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`$${val.toFixed(2)}`, pad.left - 6, gy + 4);
    }

    // price area + line
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    gradient.addColorStop(0, "rgba(56, 189, 248, 0.25)");
    gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.beginPath();
    ctx.moveTo(x(0), y(prices[0]));
    for (let i = 1; i < prices.length; i++) ctx.lineTo(x(i), y(prices[i]));
    ctx.lineTo(x(prices.length - 1), pad.top + chartH);
    ctx.lineTo(x(0), pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x(0), y(prices[0]));
    for (let i = 1; i < prices.length; i++) ctx.lineTo(x(i), y(prices[i]));
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.stroke();

    const last = prices.length - 1;
    ctx.beginPath();
    ctx.arc(x(last), y(prices[last]), 5, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();

    // exposure overlay bars
    const expTop = pad.top + chartH + 8;
    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Exposure", pad.left, expTop + 10);

    if (exposureData.length > 0) {
      const barAreaH = exposureH - 14;
      const midY = expTop + 14 + barAreaH / 2;
      const n = priceData.length - 1;

      ctx.strokeStyle = "#334155";
      ctx.beginPath();
      ctx.moveTo(pad.left, midY);
      ctx.lineTo(w - pad.right, midY);
      ctx.stroke();

      const barW = Math.max(4, chartW / n - 2);
      for (let i = 0; i < exposureData.length; i++) {
        const exp = exposureData[i].exposure;
        const px = x(i + 1) - barW / 2;
        const barH = (Math.abs(exp) * barAreaH) / 2;
        ctx.fillStyle =
          exp >= 0 ? "rgba(74, 222, 128, 0.7)" : "rgba(248, 113, 113, 0.7)";
        if (exp >= 0) {
          ctx.fillRect(px, midY - barH, barW, barH);
        } else {
          ctx.fillRect(px, midY, barW, barH);
        }
      }
    }

    // x labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    const labelEvery = Math.max(1, Math.floor(priceData.length / 5));
    for (let i = 0; i < priceData.length; i += labelEvery) {
      ctx.fillText(priceData[i].date || `D${i}`, x(i), h - 6);
    }
  }
}

const LEADERBOARD_KEY = "pipeline-pulse-leaderboard";

function formatMoney(n) {
  const sign = n >= 0 ? "" : "-";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(n) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function formatExposure(n) {
  const pct = Math.round(n * 100);
  if (pct > 0) return `+${pct}% long flat`;
  if (pct < 0) return `${pct}% short flat`;
  return "Flat (no position)";
}

let game = null;
let chart = null;
let dmMode = false;
let headlineRevealed = false;
let awaitingAction = false;
let pendingExposure = 0;

const screens = {
  start: document.getElementById("screen-start"),
  game: document.getElementById("screen-game"),
  end: document.getElementById("screen-end"),
};

const els = {};

function cacheElements() {
  const ids = [
    "scenario-title", "scenario-subtitle", "start-description",
    "dm-mode-toggle", "leaderboard-start",
    "scenario-title-game", "day-counter",
    "date-label", "headline-tag", "headline-text", "headline-context",
    "headline-hidden", "price-change", "current-price",
    "stat-cash", "stat-shares", "stat-exposure", "stat-portfolio", "stat-pnl",
    "exposure-slider", "exposure-value", "exposure-preview",
    "btn-confirm", "btn-reveal", "btn-next",
    "btn-start", "btn-restart", "btn-save-score",
    "dm-note", "dm-panel", "action-log",
    "end-summary", "end-comparison", "end-archetypes", "end-actions",
    "leaderboard-end", "player-name", "end-subtitle",
  ];
  ids.forEach((id) => {
    els[id.replace(/-/g, "_")] = document.getElementById(id);
  });
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function initMeta() {
  const { meta } = SCENARIO;
  els.scenario_title.textContent = meta.title;
  els.scenario_subtitle.textContent = meta.subtitle;
  els.start_description.textContent = meta.description;
  els.scenario_title_game.textContent = meta.title;
}

function renderLeaderboard(containerId) {
  const container = document.getElementById(containerId);
  const entries = getLeaderboard().slice(0, 10);
  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-leaderboard">No scores yet — be the first.</p>';
    return;
  }
  container.innerHTML = entries
    .map(
      (e, i) =>
        `<div class="lb-row"><span class="lb-rank">#${i + 1}</span><span class="lb-name">${escapeHtml(e.name)}</span><span class="lb-score ${e.pnl >= 0 ? "up" : "down"}">${formatMoney(e.pnl)}</span></div>`
    )
    .join("");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]").sort(
      (a, b) => b.pnl - a.pnl
    );
  } catch {
    return [];
  }
}

function saveScore(name, pnl, pct) {
  const entries = getLeaderboard();
  entries.push({
    name: name.slice(0, 24),
    pnl,
    pct,
    date: new Date().toLocaleDateString(),
  });
  entries.sort((a, b) => b.pnl - a.pnl);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
}

function updateExposurePreview(value) {
  pendingExposure = value / 100;
  els.exposure_value.textContent = formatExposure(pendingExposure);

  const pct = Math.abs(value);
  const isLong = value >= 0;
  els.exposure_preview.innerHTML = `
    <div class="exposure-bar-track">
      <div class="exposure-bar-half left">
        <div class="exposure-bar-short" style="width:${isLong ? 0 : pct}%"></div>
      </div>
      <div class="exposure-bar-half right">
        <div class="exposure-bar-long" style="width:${isLong ? pct : 0}%"></div>
      </div>
    </div>
    <div class="exposure-labels"><span>Short flat</span><span>No position</span><span>Long flat</span></div>
  `;
}

function updateHeadlinePanel() {
  const day = game.currentDay;
  const priceInfo = game.prices[game.dayIndex + 1] ?? game.prices[game.dayIndex];
  const showContent = !dmMode || headlineRevealed;

  els.date_label.textContent = day.date;

  if (showContent) {
    els.headline_hidden.classList.add("hidden");
    els.headline_tag.textContent = day.tag || "NEWS";
    els.headline_tag.className = "headline-tag tag-" + (day.tag || "news").toLowerCase();
    els.headline_text.textContent = day.headline;
    els.headline_context.textContent = day.context || "";
    els.headline_context.classList.remove("hidden");
    els.price_change.textContent = formatPct(day.change);
    els.price_change.className = "price-change " + (day.change >= 0 ? "up" : "down");
    els.price_change.classList.remove("hidden");
  } else {
    els.headline_hidden.classList.remove("hidden");
    els.headline_tag.textContent = "???";
    els.headline_tag.className = "headline-tag tag-hidden";
    els.headline_text.textContent = "";
    els.headline_context.classList.add("hidden");
    els.price_change.classList.add("hidden");
  }

  els.current_price.textContent = formatMoney(priceInfo.price);
}

function updateUI() {
  const day = game.currentDay;
  const startCash = game.scenario.meta.startingCash;
  const pnl = game.portfolioValue - startCash;

  els.day_counter.textContent = `Day ${game.dayIndex + 1} / ${game.totalDays}`;
  updateHeadlinePanel();

  els.stat_cash.textContent = formatMoney(game.cash);
  els.stat_shares.textContent = game.shares.toFixed(4);
  els.stat_exposure.textContent = formatExposure(game.exposure);
  els.stat_portfolio.textContent = formatMoney(game.portfolioValue);
  els.stat_pnl.textContent = `${pnl >= 0 ? "+" : ""}${formatMoney(pnl)}`;
  els.stat_pnl.className = "stat-value " + (pnl >= 0 ? "up" : "down");
  els.dm_note.textContent = day.dmNote || "";

  const canInteract = awaitingAction && (!dmMode || headlineRevealed);
  els.exposure_slider.disabled = !canInteract;
  els.btn_confirm.disabled = !canInteract;
  els.btn_reveal.classList.toggle("hidden", !dmMode || headlineRevealed);
  els.btn_next.disabled = awaitingAction;

  if (awaitingAction && canInteract) {
    pendingExposure = game.exposure;
    els.exposure_slider.value = Math.round(pendingExposure * 100);
    updateExposurePreview(Math.round(pendingExposure * 100));
  }

  chart.setData(game.getChartData(), game.getExposureChartData());
  renderActionLog();
}

function renderActionLog() {
  els.action_log.innerHTML = game.actions
    .map(
      (a) =>
        `<li><span class="log-date">${a.date}</span> <strong>${formatExposure(a.exposure)}</strong> @ ${formatMoney(a.price)} → ${formatMoney(a.portfolioValue)}</li>`
    )
    .join("");
}

function handleReveal() {
  headlineRevealed = true;
  updateUI();
}

function handleConfirm() {
  if (!awaitingAction || (dmMode && !headlineRevealed)) return;
  game.setExposure(pendingExposure);
  awaitingAction = false;
  els.btn_next.textContent = game.isLastDay ? "See Results" : "Next Day →";
  updateUI();
}

function handleNext() {
  if (awaitingAction) return;
  game.advance();
  if (game.finished) {
    showEndScreen();
    return;
  }
  headlineRevealed = !dmMode;
  awaitingAction = true;
  els.btn_next.textContent = "Next Day →";
  updateUI();
}

function showEndScreen() {
  const r = game.getResults();
  const scenario = SCENARIO;
  const archetypes = TradingGame.simulateArchetypes(scenario);

  els.end_subtitle.textContent = `${scenario.meta.title} — scenario complete`;

  els.end_summary.innerHTML = `
    <div class="result-card ${r.pnl >= 0 ? "positive" : "negative"}">
      <div class="result-label">Your P&amp;L</div>
      <div class="result-value">${formatMoney(r.pnl)} (${formatPct(r.pct)})</div>
      <div class="result-detail">Final portfolio: ${formatMoney(r.end)}</div>
    </div>
  `;

  const rows = [
    { label: "Your strategy", pnl: r.pnl },
    { label: "Buy & hold flat (+100% from day 1)", pnl: r.buyAndHold.pnl },
    { label: "Always flat (0% — no position)", pnl: r.alwaysFlat.pnl },
  ];

  els.end_comparison.innerHTML = rows
    .map(
      (row) =>
        `<div class="comparison-row"><span>${row.label}</span><span class="${row.pnl >= 0 ? "up" : "down"}">${formatMoney(row.pnl)}</span></div>`
    )
    .join("");

  const best = rows.reduce((a, b) => (b.pnl > a.pnl ? b : a));
  els.end_comparison.innerHTML += `<div class="comparison-verdict">Best: ${best.label} (${formatMoney(best.pnl)})</div>`;

  els.end_archetypes.innerHTML = archetypes
    .map(
      (a) => `
      <div class="archetype-card">
        <div class="archetype-header">
          <strong>${a.name}</strong>
          <span class="${a.pnl >= 0 ? "up" : "down"}">${formatMoney(a.pnl)}</span>
        </div>
        <p class="archetype-desc">${a.description}</p>
      </div>`
    )
    .join("");

  els.end_actions.innerHTML = r.actions
    .map(
      (a) =>
        `<li>${a.date}: <strong>${formatExposure(a.exposure)}</strong> @ ${formatMoney(a.price)}</li>`
    )
    .join("");

  renderLeaderboard("leaderboard-end");
  showScreen("end");
}

function startGame() {
  const scenario = SCENARIO;
  game = new TradingGame(scenario);
  dmMode = els.dm_mode_toggle.checked;
  headlineRevealed = !dmMode;
  awaitingAction = true;
  pendingExposure = 0;
  els.exposure_slider.value = 0;
  els.btn_next.textContent = "Next Day →";
  els.player_name.value = "";
  showScreen("game");
  updateUI();
}

function init() {
  cacheElements();
  initMeta();
  chart = new PriceChart(document.getElementById("price-chart"));
  renderLeaderboard("leaderboard-start");

  els.btn_start.addEventListener("click", startGame);
  els.btn_restart.addEventListener("click", () => showScreen("start"));
  els.btn_reveal.addEventListener("click", handleReveal);
  els.btn_confirm.addEventListener("click", handleConfirm);
  els.btn_next.addEventListener("click", handleNext);

  els.exposure_slider.addEventListener("input", (e) => {
    updateExposurePreview(parseInt(e.target.value, 10));
  });

  els.btn_save_score.addEventListener("click", () => {
    const name = els.player_name.value.trim() || "Anonymous";
    const r = game.getResults();
    saveScore(name, r.pnl, r.pct);
    renderLeaderboard("leaderboard-end");
    els.btn_save_score.textContent = "Saved!";
    setTimeout(() => {
      els.btn_save_score.textContent = "Save Score";
    }, 1500);
  });

  window.addEventListener("resize", () => {
    if (game) chart.setData(game.getChartData(), game.getExposureChartData());
  });
}

document.addEventListener("DOMContentLoaded", init);
