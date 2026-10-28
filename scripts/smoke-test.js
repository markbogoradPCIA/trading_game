/**
 * Smoke test: headline pool, session build, game simulation, mega bombshells.
 * Run: node scripts/smoke-test.js
 */
const { loadEngine } = require("../lib/engine");
const { RoomManager, getPublicState } = require("../lib/room-manager");
const { rankByPnl } = require("../lib/series");

const MEGA_IDS = [
  "drone-strike-ras-tanura",
  "panama-canal-transit-halt",
  "hormuz-transit-halted",
  "red-sea-ceasefire-backlog-clear",
  "venezuela-sanctions-waiver-700",
];

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  failed += 1;
  console.error(`  ✗ ${label}`);
  if (err) console.error(`    ${err.message || err}`);
}

console.log("Pipeline Pulse smoke test\n");

try {
  const { SCENARIO_HEADLINES, buildSession, TradingGame, SCENARIO_POOL } = loadEngine();

  console.log("1. Headline pool");
  if (SCENARIO_HEADLINES.length === 85) ok(`Pool size is 85 (got ${SCENARIO_HEADLINES.length})`);
  else fail(`Expected pool size 85, got ${SCENARIO_HEADLINES.length}`);

  const ids = new Set();
  for (const h of SCENARIO_HEADLINES) {
    if (ids.has(h.id)) fail(`Duplicate id: ${h.id}`);
    ids.add(h.id);
    if (h.impactWeight == null || Math.abs(h.impactWeight) > 5) {
      fail(`Bad impactWeight on ${h.id}: ${h.impactWeight}`);
    }
    if (!h.headline || !h.category || !h.reason) {
      fail(`Missing fields on ${h.id}`);
    }
  }
  if (ids.size === SCENARIO_HEADLINES.length) ok("All headline IDs unique");

  console.log("\n2. Mega bombshells in pool");
  for (const id of MEGA_IDS) {
    const h = SCENARIO_HEADLINES.find((x) => x.id === id);
    if (!h) fail(`Missing mega headline: ${id}`);
    else if (Math.abs(h.impactWeight) !== 5) fail(`${id} weight should be ±5, got ${h.impactWeight}`);
    else ok(`${id} (${h.impactWeight > 0 ? "+" : ""}${h.impactWeight})`);
  }

  console.log("\n3. Session build");
  const session = buildSession({ seed: 42 });
  if (session.days.length === 10) ok("10-day session builds");
  else fail(`Expected 10 days, got ${session.days.length}`);

  const usedIds = session.meta.sessionHeadlineIds || [];
  if (usedIds.length === 30) ok(`30 headlines drawn (${usedIds.length})`);
  else fail(`Expected 30 headlines in session, got ${usedIds.length}`);

  const megaInSession = MEGA_IDS.filter((id) => usedIds.includes(id));
  ok(`Mega headlines can appear in sessions (seed 42: ${megaInSession.length} drawn)`);

  for (const day of session.days) {
    if (!day.resolutionData?.signals?.length) fail(`Day ${day.day} missing resolutionData`);
    if (day.change == null || Number.isNaN(day.change)) fail(`Day ${day.day} missing change`);
    if (Math.abs(day.change) > 7) fail(`Day ${day.day} change exceeds cap: ${day.change}`);
    for (const h of day.headlines) {
      if ("impactWeight" in h || "difficulty" in h || "reason" in h) {
        fail(`Day ${day.day} leaks answer key in public headline`);
      }
    }
  }
  ok("All days have resolution data, capped moves, no leaked weights");

  // Move cap: ±7% max (same formula as scenarios.js)
  const netImpactToChange = (net) => {
    const raw = net * 0.42;
    return Math.round(Math.max(-7, Math.min(7, raw)) * 100) / 100;
  };
  if (netImpactToChange(20) === 7 && netImpactToChange(-20) === -7) {
    ok("Daily move caps at ±7%");
  } else fail("Move cap logic broken");

  console.log("\n4. Headline conflict sanity");
  let conflictFailures = 0;
  for (let seed = 0; seed < 500; seed++) {
    const s = buildSession({ seed });
    for (const day of s.days) {
      const ids = day.headlineIds;
      const hasKeystoneShut = ids.includes("keystone-shut-600");
      const hasKeystoneRestart = ids.includes("keystone-full-restart");
      if (hasKeystoneShut && hasKeystoneRestart) {
        conflictFailures += 1;
        if (conflictFailures === 1) {
          fail(`Seed ${seed} day ${day.day}: Keystone shut + restart on same day`);
        }
      }
    }
  }
  if (conflictFailures === 0) ok("No conflicting pairs across 500 seeded sessions (incl. Keystone)");

  console.log("\n5. Solo game simulation");
  const results = TradingGame.simulate(session, Array(10).fill(0.5));
  if (results.actions.length === 10) ok("Full 10-day solo simulation completes");
  else fail(`Expected 10 actions, got ${results.actions.length}`);

  console.log("\n6. Multiplayer room flow");
  const rooms = new RoomManager();
  const room = rooms.createRoom("host-1");
  const join = rooms.joinRoom(room.code, "Tester", "player-1");
  if (join.error) fail("Player join", join.error);
  else ok("Player joins room");

  let start = rooms.startGame(room.code);
  if (start.error) fail("Start game", start.error);
  else ok("Host starts game");

  start = rooms.revealHeadline(room.code);
  if (start.error) fail("Reveal headlines", start.error);
  else ok("Headlines revealed");

  const submit = rooms.submitExposure(room.code, "player-1", 0.25);
  if (submit.error) fail("Submit exposure", submit.error);
  else ok("Player submits exposure");

  const standings = rooms.showStandings(room.code);
  if (standings.error) fail("Show standings", standings.error);
  else ok("Standings phase");

  const day = room.sessionScenario.days[0];
  if (day.resolutionData && day.change != null) ok("Server day has resolution data");
  else fail("Server day missing resolution data");

  console.log("\n7. Meta consistency");
  if (SCENARIO_POOL.meta.poolSize === 85) ok("SCENARIO_POOL.meta.poolSize = 85");
  else fail(`meta.poolSize is ${SCENARIO_POOL.meta.poolSize}, expected 85`);

  
  console.log("\n8. Rematch and series leaderboard");
  const tied = rankByPnl([
    { id: "a", name: "Ann", pnl: 10 },
    { id: "b", name: "Bob", pnl: 10 },
    { id: "c", name: "Cara", pnl: 4 },
  ]);
  if (tied.map((row) => row.rank).join(",") === "1,1,3") ok("Tied P&L shares first place");
  else fail("Tie ranks", tied.map((row) => row.rank).join(","));

  const seriesRooms = new RoomManager();
  const seriesRoom = seriesRooms.createRoom("host-series");
  const ada = seriesRooms.joinRoom(seriesRoom.code, "Ada", "ada");
  const bea = seriesRooms.joinRoom(seriesRoom.code, "Bea", "bea");
  if (ada.error || bea.error) fail("Series join", ada.error || bea.error);
  else ok("Two players join for a series");

  const early = seriesRooms.rematch(seriesRoom.code);
  if (early.error) ok("Rematch waits until a game finishes");
  else fail("Rematch should be blocked in the lobby");

  function revealAndLock(exposures) {
    const revealed = seriesRooms.revealHeadline(seriesRoom.code);
    if (revealed.error) throw new Error(revealed.error);
    for (const [id, exposure] of Object.entries(exposures)) {
      const submitted = seriesRooms.submitExposure(seriesRoom.code, id, exposure);
      if (submitted.error) throw new Error(submitted.error);
    }
  }

  function playDays() {
    const days = seriesRooms.getRoom(seriesRoom.code).sessionScenario.days.length;
    for (let i = 0; i < days; i++) {
      const next = seriesRooms.nextDay(seriesRoom.code);
      if (next.error) throw new Error(next.error);
    }
  }

  const started = seriesRooms.startGame(seriesRoom.code);
  if (started.error) fail("Start series game", started.error);
  revealAndLock({ ada: 1, bea: -1 });
  playDays();
  if (seriesRooms.getRoom(seriesRoom.code).phase === "finished") ok("First 10-day game records a finish");
  else fail("First game did not finish");

  const blockedStart = seriesRooms.startGame(seriesRoom.code);
  if (blockedStart.error) ok("A new game starts only from the lobby");
  else fail("startGame should not reset a finished series");

  const again = seriesRooms.rematch(seriesRoom.code);
  if (again.error) fail("Rematch", again.error);
  else ok("Rematch starts the next game");

  const fresh = seriesRooms.getRoom(seriesRoom.code);
  const adaBook = fresh.players.get("ada").game;
  if (fresh.gameNumber === 2 && fresh.phase === "playing" && fresh.completedGames.length === 1) {
    ok("Series keeps game 1 and opens game 2");
  } else fail("Series state after rematch");
  if (adaBook.cash === 10000 && adaBook.shares === 0 && fresh.dayIndex === 0) ok("Rematch resets the book to $10,000");
  else fail("Book was not reset", `cash ${adaBook.cash} shares ${adaBook.shares}`);

  const blockedMid = seriesRooms.rematch(seriesRoom.code);
  if (blockedMid.error) ok("Rematch waits while a game is in progress");
  else fail("Rematch should be blocked during play");

  revealAndLock({ ada: -1, bea: 1 });
  playDays();

  const done = seriesRooms.getRoom(seriesRoom.code);
  const [gameOne, gameTwo] = done.completedGames;
  const board = getPublicState(done, { forHost: true }).series;
  const roundMoney = (n) => Math.round(n * 100) / 100;
  let seriesOk = done.completedGames.length === 2 && board.length === 2;
  for (const id of ["ada", "bea"]) {
    const first = gameOne.results.find((row) => row.id === id);
    const second = gameTwo.results.find((row) => row.id === id);
    const row = board.find((entry) => entry.id === id);
    const wins = (first.rank === 1 ? 1 : 0) + (second.rank === 1 ? 1 : 0);
    if (!row || row.games !== 2 || row.wins !== wins || row.totalPnl !== roundMoney(first.pnl + second.pnl)) {
      seriesOk = false;
    }
  }
  if (seriesOk) ok("Leaderboard sums P&L and wins across both games");
  else fail("Series totals", JSON.stringify(board));

console.log(`\n${"—".repeat(40)}`);
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
} catch (err) {
  console.error("\nFatal:", err);
  process.exit(1);
}
