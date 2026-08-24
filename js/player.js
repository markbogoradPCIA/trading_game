const socket = io({
  transports: ["websocket", "polling"],
  reconnection: true,
});

const joinScreen = document.getElementById("screen-join");
const sessionShell = document.getElementById("session-shell");

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
  exposureReadout: document.getElementById("exposure-readout"),
  exposureDirection: document.getElementById("exposure-direction"),
  slider: document.getElementById("exposure-slider"),
  preview: document.getElementById("exposure-preview"),
  btnLock: document.getElementById("btn-lock"),
  lockedExposure: document.getElementById("locked-exposure"),
  lockedResolution: document.getElementById("locked-resolution"),
  standingsResolution: document.getElementById("standings-resolution"),
  rank: document.getElementById("player-rank"),
  pnl: document.getElementById("player-pnl"),
  finalRank: document.getElementById("final-rank"),
  finalPnl: document.getElementById("final-pnl"),
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
    els.terminalDay.textContent = `Day ${state.dayIndex + 1} / ${state.totalDays}`;
  } else {
    els.terminalDay.classList.add("hidden");
  }

  if (state.phase === "lobby") {
    clearTradeTimerTick();
    show(screens.lobby);
    return;
  }

  if (state.phase === "finished") {
    clearTradeTimerTick();
    show(screens.finished);
    const rank = state.players.findIndex((p) => p.id === state.playerId) + 1;
    els.finalRank.textContent = `#${rank}`;
    els.finalPnl.textContent = formatMoney(state.me?.pnl ?? 0);
    els.finalPnl.className = "player-pnl-big " + ((state.me?.pnl ?? 0) >= 0 ? "up" : "down");
    return;
  }

  if (state.subPhase === "standings") {
    clearTradeTimerTick();
    show(screens.standings);
    showResolution();
    updateMarketStrip();
    if (state.day?.resolution) {
      els.standingsResolution.innerHTML = `<strong>Market resolved:</strong> ${state.day.resolution}`;
      els.standingsResolution.classList.remove("hidden");
    } else {
      els.standingsResolution.classList.add("hidden");
    }
    const rank = state.players.findIndex((p) => p.id === state.playerId) + 1;
    els.rank.textContent = `#${rank}`;
    els.pnl.textContent = formatMoney(state.me?.pnl ?? 0);
    els.pnl.className = "player-pnl-big " + ((state.me?.pnl ?? 0) >= 0 ? "up" : "down");
    return;
  }

  if (state.subPhase === "headline" && !state.headlineRevealed) {
    clearTradeTimerTick();
    show(screens.wait);
    tradeDayIndex = -1;
    return;
  }

  if (state.subPhase === "trade") {
    if (state.me?.confirmed) {
      clearTradeTimerTick();
      show(screens.locked);
      const pct = Math.round((state.me.exposure ?? selectedExposure) * 100);
      els.lockedExposure.textContent = `${pct >= 0 ? "+" : ""}${pct}%`;
      els.lockedResolution.classList.add("hidden");
      return;
    }

    show(screens.trade);
    updateHeadlines();
    updateMarketStrip();
    startTradeTimerTick();

    if (tradeDayIndex !== state.dayIndex) {
      initTradeScreen();
    }
    return;
  }

  tradeDayIndex = -1;
  clearTradeTimerTick();
  show(screens.wait);
}

updateExposurePreview(0);
window.addEventListener("beforeunload", clearTradeTimerTick);
