const LEADERBOARD_KEY = "pipeline-pulse-leaderboard";

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
    "date-label", "headline-tag", "headlines-list", "trade-prompt",
    "day-resolution", "price-label",
    "headline-hidden", "price-change", "current-price",
    "stat-cash", "stat-shares", "stat-exposure", "stat-portfolio", "stat-pnl",
    "exposure-slider", "exposure-value", "exposure-preview", "exposure-direction",
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
        `<div class="standing-row"><span class="standing-rank">#${i + 1}</span><span>${escapeHtml(e.name)}</span><span class="standing-pnl ${e.pnl >= 0 ? "up" : "down"}">${formatMoney(e.pnl)}</span></div>`
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

function exposureDirectionText(n) {
  const pct = Math.round(n * 100);
  if (pct > 0) return `${pct}% long flat price`;
  if (pct < 0) return `${Math.abs(pct)}% short flat price`;
  return "Neutral · no position";
}

function updateExposurePreview(value) {
  pendingExposure = value / 100;
  const pct = Math.round(value);

  els.exposure_value.textContent = `${pct >= 0 ? "+" : ""}${pct}%`;
  els.exposure_value.className =
    "exposure-readout " + (pct > 0 ? "long" : pct < 0 ? "short" : "flat");
  if (els.exposure_direction) {
    els.exposure_direction.textContent = exposureDirectionText(pendingExposure);
  }

  const abs = Math.abs(value);
  const isLong = value >= 0;
  els.exposure_preview.innerHTML = `
    <div class="track-center"></div>
    <div class="track-fill" style="width:${abs / 2}%"></div>`;
  els.exposure_preview.className =
    "trader-exposure-track " + (isLong ? "fill-right" : "fill-left");
}

function updateHeadlinePanel() {
  const day = game.currentDay;
  const showContent = !dmMode || headlineRevealed;
  const tradeOpen = awaitingAction;
  const headlines = normalizeHeadlines(day);

  els.date_label.textContent = day.date;

  if (showContent) {
    els.headline_hidden.classList.add("hidden");
    els.headline_tag.textContent =
      headlines.length > 1 ? `${headlines.length} headlines` : headlines[0]?.tag || "NEWS";
    els.headline_tag.className = "news-tag tag-" + (headlines[0]?.tag || "news").toLowerCase();

    const headlinesEl = document.getElementById("headlines-list");
    if (headlinesEl) {
      headlinesEl.innerHTML = renderHeadlinesList(headlines);
      headlinesEl.classList.remove("hidden");
    }

    if (tradeOpen && day.prompt) {
      els.trade_prompt.textContent = day.prompt;
      els.trade_prompt.classList.remove("hidden");
    } else {
      els.trade_prompt.classList.add("hidden");
    }

    if (tradeOpen) {
      els.price_change.textContent = "—";
      els.price_change.className = "stage-change pending solo-change";
      els.price_label.textContent = "Flat price (open)";
      els.current_price.textContent = formatMoney(game.openPrice);
      els.day_resolution.classList.add("hidden");
    } else {
      els.price_change.textContent = formatPct(day.change);
      els.price_change.className =
        "stage-change solo-change " + (day.change >= 0 ? "up" : "down");
      els.price_label.textContent = "Flat price (close)";
      els.current_price.textContent = formatMoney(game.closePrice);
      if (day.resolution) {
        els.day_resolution.innerHTML = `<strong>Market resolved:</strong> ${day.resolution}`;
        els.day_resolution.classList.remove("hidden");
      } else {
        els.day_resolution.classList.add("hidden");
      }
    }
    els.price_change.classList.remove("hidden");
  } else {
    els.headline_hidden.classList.remove("hidden");
    els.headline_tag.textContent = "???";
    els.headline_tag.className = "news-tag tag-hidden";
    const headlinesEl = document.getElementById("headlines-list");
    if (headlinesEl) {
      headlinesEl.innerHTML = "";
      headlinesEl.classList.add("hidden");
    }
    els.trade_prompt.classList.add("hidden");
    els.day_resolution.classList.add("hidden");
    els.price_change.classList.add("hidden");
  }
}

function updateUI() {
  const day = game.currentDay;
  const startCash = game.scenario.meta.startingCash;
  const markPrice = awaitingAction ? game.openPrice : game.closePrice;
  const pnl = game.portfolioValueAt(markPrice) - startCash;

  els.day_counter.textContent = `Day ${game.dayIndex + 1} / ${game.totalDays}`;
  updateHeadlinePanel();

  els.stat_cash.textContent = formatMoney(game.cash);
  els.stat_shares.textContent = game.shares.toFixed(4);
  els.stat_exposure.textContent = formatExposure(game.exposure);
  els.stat_portfolio.textContent = formatMoney(game.portfolioValueAt(markPrice));
  els.stat_pnl.textContent = `${pnl >= 0 ? "+" : ""}${formatMoney(pnl)}`;
  els.stat_pnl.className = "stat-val pnl-val " + (pnl >= 0 ? "up" : "down");
  els.dm_note.textContent = day.dmNote || "";

  const canInteract = awaitingAction && (!dmMode || headlineRevealed);
  els.exposure_slider.disabled = !canInteract;
  els.btn_confirm.disabled = !canInteract;
  els.btn_reveal.classList.toggle("hidden", !dmMode || headlineRevealed);
  els.btn_next.disabled = awaitingAction;
  els.btn_next.textContent = awaitingAction
    ? "Next Day →"
    : game.isLastDay
      ? "See Results"
      : "Next Day →";

  if (awaitingAction && canInteract) {
    pendingExposure = game.exposure;
    els.exposure_slider.value = Math.round(pendingExposure * 100);
    updateExposurePreview(Math.round(pendingExposure * 100));
    els.btn_confirm.textContent = "Lock exposure";
  } else if (!awaitingAction) {
    els.btn_confirm.textContent = "Locked";
  }

  const chartEnd = awaitingAction ? game.dayIndex + 1 : game.dayIndex + 2;
  chart.setData(game.prices.slice(0, chartEnd), game.getExposureChartData());
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
  const scenario = game.scenario;
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
  const scenario = buildSession();
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
