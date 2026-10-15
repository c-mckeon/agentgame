// Headless batch run: node tools/simulate.js [games]
// Plays many matches with random seeds and prints how often each side wins.

import { runMatch } from "../engine/match.js";
import { randomSeed } from "../engine/rng.js";
import createRed from "../players/red/bot.js";
import createBlue from "../players/blue/bot.js";

const games = Number(process.argv[2]) || 500;
const total = { red: 0, blue: 0, draw: 0, redCoins: 0, blueCoins: 0 };

const started = performance.now();
for (let i = 0; i < games; i++) {
  const r = runMatch(createRed, createBlue, randomSeed());
  total[r.winner] += 1;
  total.redCoins += r.red;
  total.blueCoins += r.blue;
}
const ms = performance.now() - started;

const pct = (n) => ((100 * n) / games).toFixed(1) + "%";
console.log(`${games} games in ${ms.toFixed(0)} ms`);
console.log(`Red wins  ${total.red}  (${pct(total.red)})`);
console.log(`Blue wins ${total.blue}  (${pct(total.blue)})`);
console.log(`Draws     ${total.draw}  (${pct(total.draw)})`);
console.log(`Avg coins: red ${(total.redCoins / games).toFixed(2)}, blue ${(total.blueCoins / games).toFixed(2)}`);
