// Headless batch run: node tools/simulate.js [games]
// Plays many matches with random seeds and prints how often each side wins.

import { runMatch } from "../engine/match.js";
import { randomSeed } from "../engine/rng.js";
import createRed from "../players/red/bot.js";
import createBlue from "../players/blue/bot.js";

const games = Number(process.argv[2]) || 500;
const total = { red: 0, blue: 0, draw: 0 };
const sum = { score: { red: 0, blue: 0 }, trapsSet: { red: 0, blue: 0 }, trapped: { red: 0, blue: 0 }, banked: { red: 0, blue: 0 } };

const started = performance.now();
for (let i = 0; i < games; i++) {
  const r = runMatch(createRed, createBlue, randomSeed());
  total[r.winner] += 1;
  for (const side of ["red", "blue"]) {
    sum.score[side] += r[side];
    for (const k of ["trapsSet", "trapped", "banked"]) sum[k][side] += r.stats[k][side];
  }
}
const ms = performance.now() - started;

const pct = (n) => ((100 * n) / games).toFixed(1) + "%";
const avg = (o) => `red ${(o.red / games).toFixed(2)}, blue ${(o.blue / games).toFixed(2)}`;
console.log(`${games} games in ${ms.toFixed(0)} ms`);
console.log(`Red wins  ${total.red}  (${pct(total.red)})`);
console.log(`Blue wins ${total.blue}  (${pct(total.blue)})`);
console.log(`Draws     ${total.draw}  (${pct(total.draw)})`);
console.log(`Avg per game:`);
console.log(`  final score   ${avg(sum.score)}`);
console.log(`  coins banked  ${avg(sum.banked)}`);
console.log(`  traps set     ${avg(sum.trapsSet)}`);
console.log(`  times trapped ${avg(sum.trapped)}`);
