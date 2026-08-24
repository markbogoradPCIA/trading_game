const { loadEngine } = require("./engine");



const MAX_PLAYERS = 40;

const TRADE_TIMER_MS = 120 * 1000;



const BASE_PLAYER_COLORS = [

  "#e21b3c",

  "#1368ce",

  "#d89e00",

  "#26890c",

  "#864cbf",

  "#ff3399",

  "#00bcd4",

  "#ff6f00",

  "#14b8a6",

  "#a855f7",

  "#f43f5e",

  "#0ea5e9",

];



function buildPlayerColors(count = MAX_PLAYERS) {

  const colors = BASE_PLAYER_COLORS.slice();

  while (colors.length < count) {

    const hue = Math.round((colors.length * 137.508) % 360);

    colors.push(`hsl(${hue}, 68%, 52%)`);

  }

  return colors.slice(0, count);

}



const PLAYER_COLORS = buildPlayerColors(MAX_PLAYERS);



const rooms = new Map();



function generateCode() {

  let code;

  do {

    code = String(Math.floor(100000 + Math.random() * 900000));

  } while (rooms.has(code));

  return code;

}



function publicHeadline(headline) {

  return {

    tag: headline.tag,

    category: headline.category,

    headline: headline.headline,

    context: headline.context || null,

  };

}



function normalizeDayHeadlines(day) {

  if (day.headlines?.length) {

    return day.headlines.map(publicHeadline);

  }

  if (day.headline) {

    return [

      publicHeadline({

        tag: day.tag,

        category: day.category,

        headline: day.headline,

        context: day.context,

      }),

    ];

  }

  return [];

}



function getPlayerSnapshot(player, room) {

  const start = player.game.scenario.meta.startingCash;

  player.game.dayIndex = room.dayIndex;

  const markPrice =

    room.phase === "playing" && room.subPhase === "trade"

      ? player.game.openPrice

      : player.game.closePrice;

  const portfolioValue = player.game.portfolioValueAt(markPrice);

  return {

    id: player.id,

    name: player.name,

    color: player.color,

    confirmed: player.confirmed,

    exposure: player.confirmed ? player.lastExposure : null,

    currentExposure: player.game.exposure,

    portfolioValue: Math.round(portfolioValue * 100) / 100,

    pnl: Math.round((portfolioValue - start) * 100) / 100,

  };

}



function buildPrices(scenario, dayIndex, includeClose = true) {

  const game = new (loadEngine().TradingGame)(scenario);

  const end = includeClose ? dayIndex + 2 : dayIndex + 1;

  return game.prices.slice(0, Math.max(2, end));

}



function getSessionScenario(room) {

  if (room.sessionScenario) return room.sessionScenario;

  const { SCENARIO_POOL } = loadEngine();

  return {

    ...SCENARIO_POOL,

    days: [],

  };

}



function getPublicState(room, { forHost = false, playerId = null } = {}) {

  const { SCENARIO_POOL } = loadEngine();

  const scenario = room.sessionScenario || getSessionScenario(room);

  const day =

    room.phase === "playing" || room.phase === "finished"

      ? scenario.days[room.dayIndex]

      : null;

  const showHeadline = room.headlineRevealed || room.phase === "standings" || room.phase === "finished";

  const showChange = room.subPhase === "standings" || room.phase === "finished";

  const showResolution = showChange;

  const includeClose = showChange || room.phase === "finished";



  const prices = buildPrices(scenario, room.dayIndex, includeClose);

  const openPrice = prices[Math.min(room.dayIndex, prices.length - 1)]?.price ?? scenario.meta.startPrice;

  const closeIdx = Math.min(room.dayIndex + 1, prices.length - 1);

  const closePrice = prices[closeIdx]?.price ?? openPrice;

  const currentPrice = room.subPhase === "trade" ? openPrice : closePrice;



  const players = [...room.players.values()]

    .map((p) => getPlayerSnapshot(p, room))

    .sort((a, b) => b.pnl - a.pnl);



  const me = playerId ? players.find((p) => p.id === playerId) : null;

  const tradeDeadlineAt = room.subPhase === "trade" ? room.tradeDeadlineAt ?? null : null;



  return {

    code: room.code,

    phase: room.phase,

    subPhase: room.subPhase,

    dayIndex: room.dayIndex,

    totalDays: room.sessionScenario?.days.length ?? SCENARIO_POOL.meta.sessionLength,

    poolSize: SCENARIO_POOL.meta.poolSize,

    maxPlayers: MAX_PLAYERS,

    tradeTimerSeconds: Math.round(TRADE_TIMER_MS / 1000),

    tradeDeadlineAt,

    headlineRevealed: room.headlineRevealed,

    meta: scenario.meta,

    openPrice,

    closePrice,

    currentPrice,

    chartData: prices,

    day: day

      ? {

          date: day.date,

          headlines: showHeadline ? normalizeDayHeadlines(day) : null,

          headlineCount: normalizeDayHeadlines(day).length,

          prompt: showHeadline && room.subPhase === "trade" ? day.prompt : null,

          change: showChange ? day.change : null,

          resolutionData: showResolution ? day.resolutionData : null,

        }

      : null,

    players,

    playerCount: room.players.size,

    confirmedCount: [...room.players.values()].filter((p) => p.confirmed).length,

    me,

  };

}



class RoomManager {

  createRoom(hostSocketId) {

    const code = generateCode();

    const room = {

      code,

      hostSocketId,

      phase: "lobby",

      subPhase: null,

      dayIndex: 0,

      headlineRevealed: false,

      tradeDeadlineAt: null,

      tradeTimerHandle: null,

      players: new Map(),

      colorIndex: 0,

    };

    rooms.set(code, room);

    return room;

  }



  getRoom(code) {

    return rooms.get(code) || null;

  }



  deleteRoom(code) {

    const room = this.getRoom(code);

    if (room) this.clearTradeTimer(room);

    rooms.delete(code);

  }



  clearTradeTimer(room) {

    if (!room) return;

    if (room.tradeTimerHandle) {

      clearTimeout(room.tradeTimerHandle);

      room.tradeTimerHandle = null;

    }

    room.tradeDeadlineAt = null;

  }



  startTradeTimer(code) {

    const room = this.getRoom(code);

    if (!room || room.subPhase !== "trade") return { error: "Invalid state." };



    this.clearTradeTimer(room);

    room.tradeDeadlineAt = Date.now() + TRADE_TIMER_MS;

    room.tradeTimerHandle = setTimeout(() => {

      room.tradeTimerHandle = null;

      this.showStandings(code);

      if (room.onTradeTimerExpired) room.onTradeTimerExpired(code);

    }, TRADE_TIMER_MS);



    return { room };

  }



  joinRoom(code, name, socketId) {

    const room = this.getRoom(code);

    if (!room) return { error: "Game not found. Check the PIN." };

    if (room.phase !== "lobby") return { error: "Game already started." };

    if (room.players.size >= MAX_PLAYERS) return { error: "Room is full." };



    const trimmed = name.trim().slice(0, 16);

    if (!trimmed) return { error: "Enter a nickname." };

    if ([...room.players.values()].some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {

      return { error: "That name is taken." };

    }



    const { SCENARIO_POOL, TradingGame } = loadEngine();

    const id = socketId;

    const player = {

      id,

      name: trimmed,

      socketId,

      color: PLAYER_COLORS[room.colorIndex % PLAYER_COLORS.length],

      game: new TradingGame({ ...SCENARIO_POOL, days: [] }),

      confirmed: false,

      lastExposure: 0,

    };

    room.colorIndex += 1;

    room.players.set(id, player);



    return { room, player };

  }



  startGame(code) {

    const room = this.getRoom(code);

    if (!room) return { error: "Room not found." };

    if (room.players.size === 0) return { error: "Need at least one player." };



    const { buildSession, TradingGame } = loadEngine();

    room.sessionScenario = buildSession();

    room.phase = "playing";

    room.subPhase = "headline";

    room.dayIndex = 0;

    room.headlineRevealed = false;

    this.clearTradeTimer(room);



    for (const player of room.players.values()) {

      player.game = new TradingGame(room.sessionScenario);

      player.confirmed = false;

      player.lastExposure = 0;

    }



    return { room };

  }



  revealHeadline(code) {

    const room = this.getRoom(code);

    if (!room || room.phase !== "playing") return { error: "Invalid state." };

    room.headlineRevealed = true;

    room.subPhase = "trade";



    for (const player of room.players.values()) {

      player.confirmed = false;

    }



    return { room, startTimer: true };

  }



  submitExposure(code, playerId, exposure) {

    const room = this.getRoom(code);

    if (!room || room.phase !== "playing" || room.subPhase !== "trade") {

      return { error: "Not accepting answers right now." };

    }



    const player = room.players.get(playerId);

    if (!player) return { error: "Player not found." };



    exposure = Math.max(-1, Math.min(1, exposure));

    player.game.dayIndex = room.dayIndex;

    player.game.setExposureAtPrice(exposure, player.game.openPrice);

    player.confirmed = true;

    player.lastExposure = exposure;



    const allConfirmed =

      room.players.size > 0 && [...room.players.values()].every((p) => p.confirmed);



    return { room, player, allConfirmed };

  }



  showStandings(code) {

    const room = this.getRoom(code);

    if (!room || room.phase !== "playing") return { error: "Invalid state." };



    this.clearTradeTimer(room);



    for (const player of room.players.values()) {

      if (!player.confirmed) {

        player.game.dayIndex = room.dayIndex;

        player.game.setExposureAtPrice(player.game.currentExposure, player.game.openPrice);

        player.lastExposure = player.game.exposure;

      }

    }



    room.subPhase = "standings";

    room.headlineRevealed = true;

    return { room };

  }



  nextDay(code) {

    const room = this.getRoom(code);

    if (!room || room.phase !== "playing") return { error: "Invalid state." };



    this.clearTradeTimer(room);



    const scenario = getSessionScenario(room);

    const totalDays = scenario.days.length;



    for (const player of room.players.values()) {

      player.game.advance();

      player.confirmed = false;

      player.lastExposure = player.game.exposure;

    }



    if (room.dayIndex >= totalDays - 1) {

      room.phase = "finished";

      room.subPhase = "podium";

      return { room };

    }



    room.dayIndex += 1;

    room.subPhase = "headline";

    room.headlineRevealed = false;

    return { room };

  }



  removePlayer(socketId) {

    for (const [code, room] of rooms.entries()) {

      if (room.hostSocketId === socketId) {

        this.deleteRoom(code);

        return { code, closed: true };

      }

      if (room.players.has(socketId)) {

        room.players.delete(socketId);

        return { code, closed: false, room };

      }

    }

    return null;

  }

}



module.exports = {

  RoomManager,

  getPublicState,

  MAX_PLAYERS,

  TRADE_TIMER_MS,

};


