const fs = require("fs");
const path = require("path");
const vm = require("vm");

let cached = null;

function loadEngine() {
  if (cached) return cached;

  const root = path.join(__dirname, "..", "js");
  const headlinesGlobalSrc = fs.readFileSync(
    path.join(root, "scenario-headlines-global.js"),
    "utf8"
  );
  const scenarioSrc = fs.readFileSync(path.join(root, "scenarios.js"), "utf8");
  const gameSrc = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `${headlinesGlobalSrc}\n${scenarioSrc}\n${gameSrc}\nthis.SCENARIO = SCENARIO;\nthis.SCENARIO_POOL = SCENARIO_POOL;\nthis.SCENARIO_HEADLINES = SCENARIO_HEADLINES;\nthis.buildSession = buildSession;\nthis.TradingGame = TradingGame;`,
    sandbox
  );

  if (!sandbox.SCENARIO || !sandbox.TradingGame || !sandbox.buildSession) {
    throw new Error("Failed to load game engine");
  }

  cached = {
    SCENARIO: sandbox.SCENARIO,
    SCENARIO_POOL: sandbox.SCENARIO_POOL,
    SCENARIO_HEADLINES: sandbox.SCENARIO_HEADLINES,
    buildSession: sandbox.buildSession,
    TradingGame: sandbox.TradingGame,
  };
  return cached;
}

module.exports = { loadEngine };
