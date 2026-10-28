function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

function rankByPnl(players) {
  const sorted = [...players].sort(
    (a, b) => b.pnl - a.pnl || String(a.name).localeCompare(String(b.name))
  );
  let rank = 1;
  return sorted.map((player, index) => {
    if (index > 0 && sorted[index - 1].pnl !== player.pnl) rank = index + 1;
    return { ...player, rank };
  });
}

function buildSeriesLeaderboard(completedGames) {
  const byId = new Map();

  for (const game of completedGames || []) {
    for (const row of game.results || []) {
      let entry = byId.get(row.id);
      if (!entry) {
        entry = {
          id: row.id,
          name: row.name,
          color: row.color,
          games: 0,
          wins: 0,
          totalPnl: 0,
          lastPnl: 0,
          lastRank: null,
        };
      }
      entry.name = row.name;
      entry.color = row.color;
      entry.games += 1;
      if (row.rank === 1) entry.wins += 1;
      entry.totalPnl = roundMoney(entry.totalPnl + row.pnl);
      entry.lastPnl = row.pnl;
      entry.lastRank = row.rank;
      byId.set(row.id, entry);
    }
  }

  const sorted = [...byId.values()].sort(
    (a, b) =>
      b.totalPnl - a.totalPnl || b.wins - a.wins || String(a.name).localeCompare(String(b.name))
  );
  let rank = 1;
  return sorted.map((entry, index) => {
    if (index > 0 && sorted[index - 1].totalPnl !== entry.totalPnl) rank = index + 1;
    return { ...entry, rank };
  });
}

module.exports = { rankByPnl, buildSeriesLeaderboard };
