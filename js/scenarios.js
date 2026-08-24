const HEADLINES_PER_DAY_MIN = 3;
const HEADLINES_PER_DAY_MAX = 4;
const SESSION_LENGTH_DEFAULT = 10;
const TRADE_TIMER_SECONDS = 90;

/** Percent WTI move per unit of net signed impact (training simulation scale). */
const IMPACT_TO_PCT = 0.42;

const SCENARIO_HEADLINES = SCENARIO_HEADLINES_GLOBAL;

const SCENARIO_POOL = {
  id: "pipeline",
  meta: {
    title: "Pipeline Pulse",
    subtitle: "WTI Flat Price — Global Fundamentals",
    asset: "WTI Crude (flat price)",
    unit: "barrel",
    startPrice: 72.0,
    startingCash: 10000,
    sessionLength: SESSION_LENGTH_DEFAULT,
    headlinesPerDay: { min: HEADLINES_PER_DAY_MIN, max: HEADLINES_PER_DAY_MAX },
    tradeTimerSeconds: TRADE_TIMER_SECONDS,
    maxPlayers: 40,
    poolSize: SCENARIO_HEADLINES.length,
    description:
      "Trade WTI flat price through 10 session days. Each day delivers 3–4 global fundamentals headlines — inventories, OPEC, geopolitics, macro, and logistics — all evaluated from a WTI flat-price perspective. Lock exposure before the move, then review how the market resolved.",
  },
  archetypes: [
    {
      name: "Aggressive",
      key: "aggressive",
      description:
        "Sizes up on the fundamental read — takes full directional exposure on clear inventory, refinery, and export signals",
      defaultExposure: 0.55,
    },
    {
      name: "Defensive",
      key: "defensive",
      description: "Stays light — partial exposure on high-conviction days, flat on ambiguous headlines",
      defaultExposure: 0.1,
    },
    {
      name: "Contrarian",
      key: "contrarian",
      description: "Trades against the fundamental read — benchmark for how much value correct interpretation adds",
      defaultExposure: 0.0,
    },
  ],
  days: [],
};

/** Full pool metadata — use buildSession() for a playable game. */
const SCENARIO = SCENARIO_POOL;

function _mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _shuffle(items, rng) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function expectedDirectionFromImpact(impactWeight) {
  if (impactWeight > 0) return "bullish";
  if (impactWeight < 0) return "bearish";
  return "neutral";
}

function assertUniqueHeadlinePool(headlines = SCENARIO_HEADLINES) {
  const seen = new Set();
  const duplicates = [];

  for (const headline of headlines) {
    if (!headline.id) {
      throw new Error("Headline missing id");
    }
    if (headline.impactWeight == null || Number.isNaN(headline.impactWeight)) {
      throw new Error(`Headline ${headline.id} missing impactWeight`);
    }
    if (Math.abs(headline.impactWeight) > 5) {
      throw new Error(`Headline ${headline.id} impactWeight out of range (−5…+5)`);
    }
    const implied = expectedDirectionFromImpact(headline.impactWeight);
    if (
      headline.expectedDirection &&
      implied !== "neutral" &&
      headline.expectedDirection !== implied
    ) {
      throw new Error(
        `Headline ${headline.id}: expectedDirection (${headline.expectedDirection}) does not match impactWeight sign (${headline.impactWeight})`
      );
    }
    if (seen.has(headline.id)) {
      duplicates.push(headline.id);
    }
    seen.add(headline.id);
  }

  if (duplicates.length) {
    throw new Error(`Duplicate headline ids in pool: ${duplicates.join(", ")}`);
  }

  return seen.size;
}

function publicHeadline(headline) {
  return {
    tag: headline.tag,
    category: headline.category,
    headline: headline.headline,
    context: headline.context || null,
  };
}

/** Sum of signed impactWeight across all headlines on the day. */
function computeNetImpact(headlines) {
  return headlines.reduce((total, headline) => total + (headline.impactWeight ?? 0), 0);
}

/** Convert net signed impact to simulated WTI flat-price % change. */
function netImpactToChange(netImpact) {
  const raw = netImpact * IMPACT_TO_PCT;
  const capped = Math.max(-7, Math.min(7, raw));
  return Math.round(capped * 100) / 100;
}

function alignedFromNetImpact(netImpact) {
  if (netImpact === 0) {
    return { aggressive: 0.05, defensive: 0, contrarian: 0 };
  }

  const sign = netImpact > 0 ? 1 : -1;
  const magnitude = Math.min(Math.abs(netImpact) / 12, 0.55);

  return {
    aggressive: Math.round(sign * Math.max(0.2, magnitude + 0.15) * 100) / 100,
    defensive: Math.round(sign * Math.max(0.05, magnitude * 0.35) * 100) / 100,
    contrarian: Math.round(sign * -Math.max(0.1, magnitude * 0.45) * 100) / 100,
  };
}

function netReadLabel(netImpact) {
  if (netImpact >= 4) return "strongly bullish";
  if (netImpact > 0) return "net bullish";
  if (netImpact <= -4) return "strongly bearish";
  if (netImpact < 0) return "net bearish";
  return "approximately balanced";
}

function buildDayResolution(headlines, change, netImpact) {
  const directionWord = change >= 0 ? "up" : "down";
  const sign = change >= 0 ? "+" : "";
  const reads = headlines
    .map((headline) => `• **${headline.category}:** ${headline.reason}`)
    .join("\n");

  return `WTI ${directionWord} ${sign}${change}%. Today's news flow was ${netReadLabel(netImpact)} for flat price:\n${reads}`;
}

function buildCompositeDay(headlines, dayIndex) {
  const netImpact = computeNetImpact(headlines);
  const change = netImpactToChange(netImpact);

  return {
    id: `session-day-${dayIndex + 1}`,
    day: dayIndex + 1,
    date: _sessionDate(dayIndex),
    headlines: headlines.map(publicHeadline),
    headlineIds: headlines.map((headline) => headline.id),
    prompt: "Given today's headlines, what's your first-order read for WTI flat price?",
    netImpact,
    change,
    resolution: buildDayResolution(headlines, change, netImpact),
    dmNote: headlines
      .map((headline) => `${headline.category}: ${headline.reason} (${headline.difficulty})`)
      .join(" · "),
    aligned: alignedFromNetImpact(netImpact),
  };
}

function pickHeadlinesPerDay(rng) {
  const span = HEADLINES_PER_DAY_MAX - HEADLINES_PER_DAY_MIN + 1;
  return HEADLINES_PER_DAY_MIN + Math.floor(rng() * span);
}

function _sessionDate(offset) {
  const d = new Date(2026, 2, 3 + offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Build a shuffled session: 10 trading days, each with 3–4 headlines from the pool.
 * @param {{ length?: number, seed?: number, headlinesPerDay?: number }} options
 */
function buildSession(options = {}) {
  const length = options.length ?? SCENARIO_POOL.meta.sessionLength ?? SESSION_LENGTH_DEFAULT;
  const rng = options.seed != null ? _mulberry32(options.seed) : () => Math.random();
  const poolSize = assertUniqueHeadlinePool();

  const minHeadlinesNeeded = length * HEADLINES_PER_DAY_MIN;
  if (poolSize < minHeadlinesNeeded) {
    throw new Error(
      `Headline pool (${poolSize}) is smaller than minimum needed (${minHeadlinesNeeded}) for ${length} days`
    );
  }

  const shuffled = _shuffle(SCENARIO_HEADLINES, rng);
  let cursor = 0;
  const days = [];

  for (let i = 0; i < length; i++) {
    const count = options.headlinesPerDay ?? pickHeadlinesPerDay(rng);

    if (cursor + count > shuffled.length) {
      throw new Error(
        `Not enough unique headlines remaining (need ${count}, have ${shuffled.length - cursor})`
      );
    }

    const group = shuffled.slice(cursor, cursor + count);
    cursor += count;
    days.push(buildCompositeDay(group, i));
  }

  SCENARIO_POOL.meta.poolSize = poolSize;

  return {
    id: SCENARIO_POOL.id,
    meta: {
      ...SCENARIO_POOL.meta,
      sessionLength: length,
      poolSize,
      sessionSeed: options.seed ?? null,
      sessionDayIds: days.map((day) => day.id),
      sessionHeadlineIds: days.flatMap((day) => day.headlineIds),
    },
    days,
    archetypes: SCENARIO_POOL.archetypes,
  };
}

assertUniqueHeadlinePool();
