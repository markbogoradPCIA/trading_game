const socket = io();
const chart = new PriceChart(document.getElementById("host-chart"), "dark");

const els = {
  pin: document.getElementById("game-pin"),
  joinUrl: document.getElementById("join-url"),
  joinQr: document.getElementById("join-qr"),
  lobby: document.getElementById("screen-lobby"),
  playing: document.getElementById("screen-playing"),
  playerGrid: document.getElementById("player-grid"),
  lobbyCount: document.getElementById("lobby-count"),
  lobbyCapacity: document.getElementById("lobby-capacity"),
  btnStart: document.getElementById("btn-start"),
  dayLabel: document.getElementById("day-label"),
  headlinePlaceholder: document.getElementById("stage-headline-placeholder"),
  headlinesList: document.getElementById("stage-headlines-list"),
  stagePrompt: document.getElementById("stage-prompt"),
  stagePriceRow: document.getElementById("stage-price-row"),
  stagePrice: document.getElementById("stage-price"),
  stageChange: document.getElementById("stage-change"),
  headlineWrap: document.getElementById("stage-headline-wrap"),
  tradeTimer: document.getElementById("trade-timer"),
  tradeTimerValue: document.getElementById("trade-timer-value"),
  standings: document.getElementById("stage-standings"),
  standingsList: document.getElementById("standings-list"),
  podium: document.getElementById("stage-podium"),
  podiumList: document.getElementById("podium-list"),
  dmBox: document.getElementById("dm-box"),
  stageResolution: document.getElementById("stage-resolution"),
  hostStatus: document.getElementById("host-status"),
  btnReveal: document.getElementById("btn-reveal"),
  btnStandings: document.getElementById("btn-standings"),
  btnNext: document.getElementById("btn-next"),
};

let state = null;
let timerInterval = null;

socket.emit("host:create");

socket.on("host:created", ({ code, joinUrl, state: s }) => {
  state = s;
  els.pin.textContent = code;
  const url = joinUrl.startsWith("http") ? joinUrl : `${location.origin}${joinUrl}`;
  els.joinUrl.textContent = url.replace(/^https?:\/\//, "");
  renderJoinQr(code, url);
  render();
});

socket.on("host:update", (s) => {
  state = s;
  render();
});

socket.on("host:error", (msg) => {
  els.hostStatus.textContent = msg;
});

els.btnStart.addEventListener("click", () => socket.emit("host:start"));
els.btnReveal.addEventListener("click", () => socket.emit("host:reveal"));
els.btnStandings.addEventListener("click", () => socket.emit("host:standings"));
els.btnNext.addEventListener("click", () => socket.emit("host:next"));

function renderJoinQr(code, url) {
  if (!els.joinQr) return;
  els.joinQr.src = `/api/join-qr/${encodeURIComponent(code)}`;
  els.joinQr.alt = `Scan to join session ${code}`;
  els.joinQr.title = url;
}

function clearTradeTimerTick() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTradeTimerDisplay() {
  if (!state || state.subPhase !== "trade" || !state.tradeDeadlineAt) {
    els.tradeTimer.classList.add("hidden");
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

function render() {
  if (!state) return;

  const maxPlayers = state.maxPlayers ?? 40;

  if (state.phase === "lobby") {
    els.lobby.classList.remove("hidden");
    els.playing.classList.add("hidden");
    clearTradeTimerTick();
    els.playerGrid.innerHTML = state.players
      .map(
        (p) =>
          `<div class="player-chip" style="background:${p.color}">${escapeHtml(p.name)}</div>`
      )
      .join("");
    els.lobbyCount.textContent = `${state.playerCount} player${state.playerCount === 1 ? "" : "s"} joined`;
    els.lobbyCapacity.textContent = `${state.playerCount} / ${maxPlayers}`;
    els.btnStart.disabled = state.playerCount === 0;
    return;
  }

  els.lobby.classList.add("hidden");
  els.playing.classList.remove("hidden");

  chart.setData(state.chartData || []);
  els.dayLabel.textContent = `Day ${state.dayIndex + 1} / ${state.totalDays}`;

  hideControls();

  if (state.phase === "finished") {
    clearTradeTimerTick();
    showPodium();
    return;
  }

  if (state.subPhase === "standings") {
    clearTradeTimerTick();
    showStandings(false);
    els.btnNext.classList.remove("hidden");
    els.hostStatus.textContent =
      state.dayIndex >= state.totalDays - 1 ? "Final standings — click to finish" : "Review standings, then next day";
    return;
  }

  showHeadlines();

  if (state.subPhase === "headline") {
    clearTradeTimerTick();
    els.btnReveal.classList.remove("hidden");
    els.hostStatus.textContent = `${state.confirmedCount}/${state.playerCount} ready · Reveal headlines to start the ${state.tradeTimerSeconds ?? 90}s timer`;
    return;
  }

  if (state.subPhase === "trade") {
    startTradeTimerTick();
    els.btnStandings.classList.remove("hidden");
    const remaining = getTradeSecondsRemaining(state.tradeDeadlineAt);
    els.hostStatus.textContent = `${state.confirmedCount} / ${state.playerCount} locked in · ${formatTimer(remaining)} remaining`;
    if (state.confirmedCount === state.playerCount && state.playerCount > 0) {
      els.hostStatus.textContent += " — all in!";
    }
  }
}

function hideControls() {
  els.btnReveal.classList.add("hidden");
  els.btnStandings.classList.add("hidden");
  els.btnNext.classList.add("hidden");
  els.headlineWrap.classList.remove("hidden");
  els.standings.classList.add("hidden");
  els.podium.classList.add("hidden");
  els.stageResolution.classList.add("hidden");
}

function showHeadlines() {
  const day = state.day;
  const revealed = state.headlineRevealed;
  const inTrade = state.subPhase === "trade";
  const showMove = state.subPhase === "standings";
  const headlines = normalizeHeadlines(day);

  if (revealed && headlines.length) {
    els.headlinePlaceholder.classList.add("hidden");
    els.headlinesList.classList.remove("hidden");
    els.headlinesList.innerHTML = renderHeadlinesList(headlines);

    if (day.prompt && inTrade) {
      els.stagePrompt.textContent = day.prompt;
      els.stagePrompt.classList.remove("hidden");
    } else {
      els.stagePrompt.classList.add("hidden");
    }

    els.stagePriceRow.classList.remove("hidden");
    els.stagePrice.textContent = formatMoney(
      inTrade ? state.openPrice ?? state.currentPrice : state.closePrice ?? state.currentPrice
    );

    if (showMove && day.change != null) {
      els.stageChange.textContent = formatPct(day.change);
      els.stageChange.className = "stage-change " + (day.change >= 0 ? "up" : "down");
    } else {
      els.stageChange.textContent = "—";
      els.stageChange.className = "stage-change pending";
    }
  } else {
    els.headlinePlaceholder.classList.remove("hidden");
    els.headlinesList.classList.add("hidden");
    els.headlinesList.innerHTML = "";
    els.stagePrompt.classList.add("hidden");
    els.stagePriceRow.classList.add("hidden");
  }

  if (showMove && day?.resolution) {
    els.stageResolution.innerHTML = `<strong>Market resolved:</strong> ${day.resolution}`;
    els.stageResolution.classList.remove("hidden");
  } else {
    els.stageResolution.classList.add("hidden");
  }

  if (day?.dmNote || day?.netImpact != null) {
    const parts = [];
    if (day.netImpact != null) {
      parts.push(`[Host only] Net impact: ${day.netImpact > 0 ? "+" : ""}${day.netImpact}`);
    }
    if (day.dmNote) parts.push(day.dmNote);
    els.dmBox.textContent = parts.join("\n\n");
    els.dmBox.classList.remove("hidden");
  } else {
    els.dmBox.classList.add("hidden");
  }
}

function showStandings(isFinal) {
  els.headlineWrap.classList.remove("hidden");
  showHeadlines();
  els.standings.classList.remove("hidden");
  els.standingsList.innerHTML = renderStandings(state.players, isFinal);
}

function showPodium() {
  els.headlineWrap.classList.add("hidden");
  els.podium.classList.remove("hidden");
  els.podiumList.innerHTML = renderStandings(state.players, true);
  els.hostStatus.textContent = "Game complete!";
}

function renderStandings(players, isFinal) {
  return players
    .map((p, i) => {
      const exp =
        p.exposure !== null ? `<div class="standing-exposure">${formatExposureShort(p.exposure)} today</div>` : "";
      return `
        <div class="standing-row ${i === 0 && isFinal ? "top-1" : ""}" style="border-left: 6px solid ${p.color}">
          <span class="standing-rank">#${i + 1}</span>
          <div>
            <div>${escapeHtml(p.name)}</div>
            ${exp}
          </div>
          <span class="standing-pnl ${p.pnl >= 0 ? "up" : "down"}">${formatMoney(p.pnl)}</span>
        </div>`;
    })
    .join("");
}

window.addEventListener("resize", () => {
  if (state?.chartData) chart.setData(state.chartData);
});

window.addEventListener("beforeunload", clearTradeTimerTick);
