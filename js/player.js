const socket = io({
  transports: ["websocket", "polling"],
  reconnection: true,
});

const joinScreen = document.getElementById("screen-join");
const sessionShell = document.getElementById("session-shell");
const playerDock = document.getElementById("player-dock");

const screens = {
  lobby: document.getElementById("screen-lobby"),
  wait: document.getElementById("screen-wait"),
  trade: document.getElementById("screen-trade"),
  locked: document.getElementById("screen-locked"),
  standings: document.getElementById("screen-standings"),
  finished: document.getElementById("screen-finished"),
};

const els = {
  pin: document.getElementById("input-pin"),
  name: document.getElementById("input-name"),
  joinError: document.getElementById("join-error"),
  btnJoin: document.getElementById("btn-join"),
  app: document.getElementById("player-app"),
  terminalDay: document.getElementById("terminal-day"),
  terminalAsset: document.getElementById("terminal-asset"),
  playerBadge: document.getElementById("player-badge"),
  headlineDate: document.getElementById("headline-date"),
  headlinesList: document.getElementById("player-headlines-list"),
  tradePrompt: document.getElementById("trade-prompt"),
  tradeTimer: document.getElementById("trade-timer"),
  tradeTimerValue: document.getElementById("trade-timer-value"),
  marketPrice: document.getElementById("market-price"),
  marketChange: document.getElementById("market-change"),
  marketPnl: document.getElementById("market-pnl"),
  orderDockTrade: document.getElementById("order-dock-trade"),
  orderDockLocked: document.getElementById("order-dock-locked"),
  orderDockIdle: document.getElementById("order-dock-idle"),
  exposureReadout: document.getElementById("exposure-readout"),
  exposureDirection: document.getElementById("exposure-direction"),
  slider: document.getElementById("exposure-slider"),
  preview: document.getElementById("exposure-preview"),
  btnLock: document.getElementById("btn-lock"),
  lockedExposure: document.getElementById("locked-exposure"),
  lockedResolution: document.getElementById("locked-resolution"),
  standingsResolution: document.getElementById("standings-resolution"),
  rank: document.getElementById("player-rank"),
  finalRank: document.getElementById("final-rank"),
  finalEyebrow: document.getElementById("final-eyebrow"),
  finalPnl: document.getElementById("final-pnl"),
  seriesSummary: document.getElementById("series-summary"),
};

let state = null;
let playerName = "";
let playerColor = "#38bdf8";
let selectedExposure = 0;
let tradeDayIndex = -1;
let timerInterval = null;

const params = new URLSearchParams(location.search);
if (params.get("pin")) {
  els.pin.value = params.get("pin");
  els.name.focus();
}

els.btnJoin.addEventListener("click", join);
els.name.addEventListener("keydown", (e) => {
  if (e.key === "Enter") join();
});
els.pin.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.name.focus();
});

els.slider.addEventListener("input", (e) => {
  updateExposurePreview(parseInt(e.target.value, 10));
});

els.btnLock.addEventListener("click", () => {
  els.btnLock.disabled = true;
  els.slider.disabled = true;
  socket.emit("player:submit", { exposure: selectedExposure }, (res) => {
    if (!res?.ok) {
      els.joinError.textContent = res?.error || "Could not submit";
      els.joinError.classList.remove("hidden");
      els.btnLock.disabled = false;
      els.slider.disabled = false;
    }
  });
});

socket.on("player:update", (s) => {
  state = s;
  if (s.color) playerColor = s.color;
  applyPlayerTheme();
  render();
});

function applyPlayerTheme() {
  els.app.style.setProperty("--player-accent", playerColor);
  if (playerName) {
    els.playerBadge.textContent = playerName;
    els.playerBadge.style.background = playerColor;
  }
}

function clearTradeTimerTick() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTradeTimerDisplay() {
  if (!state || state.subPhase !== "trade" || !state.tradeDeadlineAt) {
    els.tradeTimer?.classList.add("hidden");
    clearTradeTimerTick();
    return;
  }

  const remaining = getTradeSecondsRemaining(state.tradeDeadlineAt);
  els.tradeTimer.classList.remove("hidden");
  els.tradeTimerValue.textContent = formatTimer(remaining);

  if (remaining <= 10) {
    els.tradeTimer.classList.add("trade-timer-urgent");
  } else {
    els.tradeTimer.classList.remove("trade-timer-urgent");
  }

  if (remaining <= 0) {
    clearTradeTimerTick();
  }
}

function startTradeTimerTick() {
  clearTradeTimerTick();
  updateTradeTimerDisplay();
  timerInterval = setInterval(updateTradeTimerDisplay, 250);
}

function exposureDirectionText(n) {
  const pct = Math.round(n * 100);
  if (pct > 0) return `${pct}% long flat price`;
  if (pct < 0) return `${Math.abs(pct)}% short flat price`;
  return "Neutral · no position";
}

function updateExposurePreview(value) {
  selectedExposure = value / 100;
  const pct = Math.round(value);

  els.exposureReadout.textContent = `${pct >= 0 ? "+" : ""}${pct}%`;
  els.exposureReadout.className =
    "exposure-readout " + (pct > 0 ? "long" : pct < 0 ? "short" : "flat");
  els.exposureDirection.textContent = exposureDirectionText(selectedExposure);

  const abs = Math.abs(value);
  const isLong = value >= 0;
  els.preview.innerHTML = `
    <div class="track-center"></div>
    <div class="track-fill ${isLong ? "long" : "short"}" style="width:${abs / 2}%"></div>`;
  els.preview.className = "trader-exposure-track " + (isLong ? "fill-right" : "fill-left");
}

function initTradeScreen() {
  const defaultExp = state.me?.currentExposure ?? 0;
  selectedExposure = defaultExp;
  const sliderVal = Math.round(defaultExp * 100);
  els.slider.value = sliderVal;
  els.slider.disabled = false;
  els.btnLock.disabled = false;
  els.btnLock.textContent = "Submit order";
  updateExposurePreview(sliderVal);
  tradeDayIndex = state.dayIndex;
}

function updateMarketStrip() {
  if (!state) return;

  els.marketPrice.textContent = formatMoney(state.openPrice ?? state.currentPrice ?? 0);

  if (state.day?.change != null && state.subPhase !== "trade") {
    const ch = state.day.change;
    els.marketChange.textContent = formatPct(ch);
    els.marketChange.className = "stat-val change-val " + (ch >= 0 ? "up" : "down");
  } else {
    els.marketChange.textContent = "—";
    els.marketChange.className = "stat-val change-val pending";
  }

  const pnl = state.me?.pnl ?? 0;
  els.marketPnl.textContent = (pnl >= 0 ? "+" : "") + formatMoney(pnl);
  els.marketPnl.className = "stat-val pnl-val " + (pnl >= 0 ? "up" : "down");
}

function setOrderDockMode(mode) {
  els.orderDockTrade.classList.toggle("hidden", mode !== "trade");
  els.orderDockLocked.classList.toggle("hidden", mode !== "locked");
  els.orderDockIdle.classList.toggle("hidden", mode !== "idle");
}

function updateHeadlines() {
  const day = state.day;
  const headlines = normalizeHeadlines(day);
  if (!headlines.length) return;

  els.headlineDate.textContent = day.date || "";
  els.headlinesList.innerHTML = renderHeadlinesList(headlines, { compact: true });

  if (day.prompt) {
    els.tradePrompt.textContent = day.prompt;
    els.tradePrompt.classList.remove("hidden");
  } else {
    els.tradePrompt.classList.add("hidden");
  }
}

function showResolution() {
  if (state.day?.change != null) {
    const ch = state.day.change;
    els.marketChange.textContent = formatPct(ch);
    els.marketChange.className = "stat-val change-val " + (ch >= 0 ? "up" : "down");
    els.marketPrice.textContent = formatMoney(state.closePrice ?? state.currentPrice);
  }
}

function join() {
  els.joinError.classList.add("hidden");
  const code = els.pin.value.trim();
  const name = els.name.value.trim();
  if (code.length !== 6) {
    els.joinError.textContent = "Enter the 6-digit PIN";
    els.joinError.classList.remove("hidden");
    return;
  }

  els.btnJoin.disabled = true;
  socket.emit("player:join", { code, name }, (res) => {
    els.btnJoin.disabled = false;
    if (!res?.ok) {
      els.joinError.textContent = res.error;
      els.joinError.classList.remove("hidden");
      return;
    }
    playerName = name;
    playerColor = res.color;
    state = res.state;
    applyPlayerTheme();
    joinScreen.classList.add("hidden");
    sessionShell.classList.remove("hidden");
    render();
  });
}


function playerRank(players, id) {
  const ranks = standingRanks(players);
  const index = players.findIndex((player) => player.id === id);
  return index >= 0 ? ranks[index] : 0;
}

function renderSeriesSummary(entry) {
  const total = (entry.totalPnl >= 0 ? "+" : "") + formatMoney(entry.totalPnl);
  const totalClass = entry.totalPnl >= 0 ? "up" : "down";
  const games = `${entry.games} game${entry.games === 1 ? "" : "s"}`;
  const wins = `${entry.wins} win${entry.wins === 1 ? "" : "s"}`;
  return `
    <div class="series-summary-label">Series</div>
    <div class="series-summary-rank">#${entry.rank}</div>
    <div class="series-summary-meta">${games} · ${wins}</div>
    <div class="player-pnl-big ${totalClass}">${total} total</div>`;
}

function show(screen) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function render() {
  if (!state) return;

  if (state.meta?.asset) {
    els.terminalAsset.textContent = state.meta.asset + " · flat $/bbl";
  }

  if (state.phase !== "lobby") {
    els.terminalDay.classList.remove("hidden");
    els.terminalDay.textContent = `Game ${state.gameNumber || 1} · Day ${state.dayIndex + 1} / ${state.totalDays}`;
  } else {
    els.terminalDay.classList.add("hidden");
  }

  if (state.phase === "lobby") {
    clearTradeTimerTick();
    playerDock.classList.add("hidden");
    show(screens.lobby);
    return;
  }

  playerDock.classList.remove("hidden");
  updateMarketStrip();

  if (state.phase === "finished") {
    clearTradeTimerTick();
    playerDock.classList.add("hidden");
    show(screens.finished);
    const rank = playerRank(state.players, state.playerId);
    els.finalEyebrow.textContent = `Game ${state.gameNumber || 1} complete`;
    els.finalRank.textContent = `#${rank}`;
    const pnl = state.me?.pnl ?? 0;
    els.finalPnl.textContent = (pnl >= 0 ? "+" : "") + formatMoney(pnl);
    els.finalPnl.className = "player-pnl-big " + (pnl >= 0 ? "up" : "down");
    const entry = (state.series || []).find((row) => row.id === state.playerId);
    els.seriesSummary.innerHTML = entry ? renderSeriesSummary(entry) : "";
    return;
  }

  if (state.subPhase === "standings") {
    clearTradeTimerTick();
    setOrderDockMode("idle");
    show(screens.standings);
    showResolution();
    if (state.day?.resolutionData) {
      els.standingsResolution.innerHTML = renderDayResolution(state.day.resolutionData);
      els.standingsResolution.classList.remove("hidden");
    } else {
      els.standingsResolution.classList.add("hidden");
    }
    const rank = playerRank(state.players, state.playerId);
    els.rank.textContent = `#${rank}`;
    return;
  }

  if (state.subPhase === "headline" && !state.headlineRevealed) {
    clearTradeTimerTick();
    setOrderDockMode("idle");
    show(screens.wait);
    tradeDayIndex = -1;
    return;
  }

  if (state.subPhase === "trade") {
    if (state.me?.confirmed) {
      clearTradeTimerTick();
      setOrderDockMode("locked");
      const pct = Math.round((state.me.exposure ?? selectedExposure) * 100);
      els.lockedExposure.textContent = `${pct >= 0 ? "+" : ""}${pct}%`;
      show(screens.locked);
      return;
    }

    setOrderDockMode("trade");
    show(screens.trade);
    updateHeadlines();
    startTradeTimerTick();

    if (tradeDayIndex !== state.dayIndex) {
      initTradeScreen();
    }
    return;
  }

  tradeDayIndex = -1;
  clearTradeTimerTick();
  setOrderDockMode("idle");
  show(screens.wait);
}

updateExposurePreview(0);
window.addEventListener("beforeunload", clearTradeTimerTick);
