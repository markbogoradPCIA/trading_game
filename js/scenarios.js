const HEADLINES_PER_DAY = 3;
const SESSION_LENGTH_DEFAULT = 10;
const TRADE_TIMER_SECONDS = 120;

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
    headlinesPerDay: HEADLINES_PER_DAY,
    tradeTimerSeconds: TRADE_TIMER_SECONDS,
    maxPlayers: 40,
    poolSize: SCENARIO_HEADLINES.length,
    description:
      "Trade WTI flat price through 10 session days. Each day delivers 3 global fundamentals headlines — inventories, OPEC, geopolitics, macro, and logistics — all evaluated from a WTI flat-price perspective. Lock exposure before the move, then review how the market resolved.",
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

/** Categories with 3+ headlines need explicit sub-groups (mutually exclusive pairs). */
const CONFLICT_GROUP_BY_ID = {
  "china-imports-record-121": "china-imports",
  "china-imports-fall-95": "china-imports",
  "china-throughput-record-155": "china-refining",
  "china-runs-fall-10": "china-refining",
  "opec-cut-12-additional": "opec-policy",
  "opec-increase-12": "opec-policy",
  "opec-output-below-target-800": "opec-compliance",
  "opec-output-above-quota-900": "opec-compliance",
  "opec-postpone-increase": "opec-timing",
  "opec-forward-increase": "opec-timing",
  "global-pmi-expansion": "global-pmi",
  "global-pmi-contraction": "global-pmi",
  "global-growth-upgraded": "global-growth",
  "recession-forecasts-rise": "global-growth",
};

function buildConflictGroupMap(headlines = SCENARIO_HEADLINES) {
  const byCategory = {};
  for (const headline of headlines) {
    if (!byCategory[headline.category]) byCategory[headline.category] = [];
    byCategory[headline.category].push(headline);
  }

  const map = new Map();
  for (const headline of headlines) {
    let group = headline.conflictGroup || CONFLICT_GROUP_BY_ID[headline.id];
    if (!group) {
      const peers = byCategory[headline.category] || [];
      group = peers.length === 2 ? `cat:${headline.category}` : headline.id;
    }
    map.set(headline.id, group);
  }
  return map;
}

const HEADLINE_CONFLICT_GROUPS = buildConflictGroupMap();

function headlinesConflict(a, b, groupMap = HEADLINE_CONFLICT_GROUPS) {
  if (!a || !b || a.id === b.id) return true;
  return groupMap.get(a.id) === groupMap.get(b.id);
}

function isCompatibleDayGroup(headlines, groupMap = HEADLINE_CONFLICT_GROUPS) {
  for (let i = 0; i < headlines.length; i++) {
    for (let j = i + 1; j < headlines.length; j++) {
      if (headlinesConflict(headlines[i], headlines[j], groupMap)) return false;
    }
  }
  return true;
}

function pickCompatibleDayHeadlines(remaining, count, rng, groupMap = HEADLINE_CONFLICT_GROUPS) {
  if (remaining.length < count) {
    throw new Error(`Not enough headlines remaining (need ${count}, have ${remaining.length})`);
  }

  for (let attempt = 0; attempt < 80; attempt++) {
    const order =
      attempt === 0 ? remaining : _shuffle(remaining, rng);
    const group = [];
    const pickedIndices = [];

    for (let i = 0; i < order.length && group.length < count; i++) {
      const candidate = order[i];
      const realIndex = remaining.indexOf(candidate);
      if (realIndex === -1) continue;
      if (group.every((h) => !headlinesConflict(h, candidate, groupMap))) {
        group.push(candidate);
        pickedIndices.push(realIndex);
      }
    }

    if (group.length === count) {
      pickedIndices.sort((a, b) => b - a);
      for (const idx of pickedIndices) remaining.splice(idx, 1);
      return group;
    }
  }

  throw new Error(
    `Could not pick ${count} compatible headlines from ${remaining.length} remaining`
  );
}

function validateSession(session, groupMap = HEADLINE_CONFLICT_GROUPS) {
  const issues = [];
  for (const day of session.days) {
    const ids = day.headlineIds || [];
    const headlines = ids.map((id) => SCENARIO_HEADLINES.find((h) => h.id === id)).filter(Boolean);
    if (headlines.length !== ids.length) {
      issues.push(`Day ${day.day}: unknown headline id in session`);
      continue;
    }
    if (!isCompatibleDayGroup(headlines, groupMap)) {
      const groups = headlines.map((h) => `${h.id} (${groupMap.get(h.id)})`);
      issues.push(`Day ${day.day}: conflicting headlines — ${groups.join(", ")}`);
    }
  }
  return issues;
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

function buildDayResolutionData(headlines, change, netImpact) {
  return {
    change,
    direction: change >= 0 ? "up" : "down",
    netRead: netReadLabel(netImpact),
    signals: headlines.map((headline) => ({
      category: headline.category,
      reason: headline.reason,
    })),
  };
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
    resolutionData: buildDayResolutionData(headlines, change, netImpact),
    aligned: alignedFromNetImpact(netImpact),
  };
}

function pickHeadlinesPerDay() {
  return HEADLINES_PER_DAY;
}

function _sessionDate(offset) {
  const d = new Date(2026, 2, 3 + offset);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Build a shuffled session: 10 trading days, each with 3 headlines from the pool.
 * @param {{ length?: number, seed?: number, headlinesPerDay?: number }} options
 */
function buildSession(options = {}) {
  const length = options.length ?? SCENARIO_POOL.meta.sessionLength ?? SESSION_LENGTH_DEFAULT;
  const rng = options.seed != null ? _mulberry32(options.seed) : () => Math.random();
  const poolSize = assertUniqueHeadlinePool();

  const minHeadlinesNeeded = length * HEADLINES_PER_DAY;
  if (poolSize < minHeadlinesNeeded) {
    throw new Error(
      `Headline pool (${poolSize}) is smaller than minimum needed (${minHeadlinesNeeded}) for ${length} days`
    );
  }

  const shuffled = _shuffle(SCENARIO_HEADLINES, rng);
  const remaining = shuffled.slice();
  const days = [];

  for (let i = 0; i < length; i++) {
    const count = options.headlinesPerDay ?? pickHeadlinesPerDay();
    const group = pickCompatibleDayHeadlines(remaining, count, rng);
    days.push(buildCompositeDay(group, i));
  }

  const session = {
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

  const sanityIssues = validateSession(session);
  if (sanityIssues.length) {
    throw new Error(`Session failed headline sanity check:\n${sanityIssues.join("\n")}`);
  }

  SCENARIO_POOL.meta.poolSize = poolSize;

  return session;
}

assertUniqueHeadlinePool();

