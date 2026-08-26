const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "js/scenario-headlines-global.js"), "utf8");
const sandbox = {};
vm.runInContext(
  `${src}\nthis.SCENARIO_HEADLINES_GLOBAL = SCENARIO_HEADLINES_GLOBAL;`,
  vm.createContext(sandbox)
);
const headlines = sandbox.SCENARIO_HEADLINES_GLOBAL;

const MEGA_BOMBSHELL_IDS = [
  "drone-strike-ras-tanura",
  "panama-canal-transit-halt",
  "hormuz-transit-halted",
  "red-sea-ceasefire-backlog-clear",
  "venezuela-sanctions-waiver-700",
];

function formatWeight(weight) {
  return weight > 0 ? `+${weight}` : String(weight);
}

function escTable(text) {
  return String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

const byCategory = {};
for (const h of headlines) {
  if (!byCategory[h.category]) byCategory[h.category] = [];
  byCategory[h.category].push(h);
}

const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b));
const megaBombshells = MEGA_BOMBSHELL_IDS.map((id) => {
  const headline = headlines.find((h) => h.id === id);
  if (!headline) throw new Error(`Missing mega bombshell headline: ${id}`);
  return headline;
});

let md = `# Headline List

| Weight | Meaning |
| ---: | --- |
| ±1 | Weak |
| ±2 | Moderate |
| ±3 | Strong |
| ±4 | Very strong |
| ±5 | Major shock |

+ bullish WTI · − bearish WTI

**${headlines.length} headlines** · **${categories.length} topics**

## Mega bombshells (±5)

| # | Weight | Topic | Headline |
| --: | ---: | --- | --- |
`;

megaBombshells.forEach((h, i) => {
  md += `| ${i + 1} | ${formatWeight(h.impactWeight)} | ${escTable(h.category)} | ${escTable(h.headline)} |\n`;
});

md += `\n---\n\n## All headlines by topic\n\n`;

let overall = 0;
for (const category of categories) {
  const items = byCategory[category];
  md += `### ${category} (${items.length})\n\n`;
  md += `| # | Weight | Headline |\n| --: | ---: | --- |\n`;
  items.forEach((h) => {
    overall += 1;
    md += `| ${overall} | ${formatWeight(h.impactWeight)} | ${escTable(h.headline)} |\n`;
  });
  md += `\n`;
}

const outDir = path.join(root, "docs");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "headlines-and-weights.md");
fs.writeFileSync(outPath, md, "utf8");
console.log(`Wrote ${outPath}`);
