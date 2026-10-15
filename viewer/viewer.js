// Browser viewer: plays matches live, one after another, with smooth animation.
// Add ?seed=123 to the URL to replay a specific match.

import { createGame, isOver, winner, SIDES } from "../engine/game.js";
import { playTick } from "../engine/match.js";
import { randomSeed } from "../engine/rng.js";
import { createRenderer } from "./render.js";
import createRed from "../players/red/bot.js";
import createBlue from "../players/blue/bot.js";

const TICK_MS = 160;           // time per tick at 1× speed
const PAUSE_BETWEEN_MS = 3500; // result screen before the next match
const SPEEDS = [1, 2, 4, 8];
const TEAM_COLOR = { red: "#ff6b6b", blue: "#5aa9ff" };

const $ = (id) => document.getElementById(id);
const renderer = createRenderer($("canvas"));

const tally = { red: 0, blue: 0, draw: 0 };
let speedIndex = 0;
let paused = false;

let game, bots, prev, facing, effects, acc, finishedAt;

function startMatch(seed = randomSeed()) {
  game = createGame(seed);
  bots = { red: createRed(), blue: createBlue() };
  prev = snapshotUnits();
  facing = { red: { dx: 1, dy: 0 }, blue: { dx: -1, dy: 0 } };
  effects = [];
  acc = 0;
  finishedAt = null;
  $("overlay").hidden = true;
  $("seed-link").textContent = `seed ${seed}`;
  $("seed-link").href = `?seed=${seed}`;
  renderer.setMatch(game);
  updateHud();
}

function snapshotUnits() {
  return Object.fromEntries(SIDES.map((s) => [s, { x: game.units[s].x, y: game.units[s].y }]));
}

// ---------- main loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(now - last, 250);
  last = now;
  const tickMs = TICK_MS / SPEEDS[speedIndex];

  if (!paused && !isOver(game)) {
    acc += dt;
    while (acc >= tickMs && !isOver(game)) {
      acc -= tickMs;
      prev = snapshotUnits();
      for (const e of playTick(game, bots)) effects.push({ ...e, born: now });
      for (const side of SIDES) {
        const dx = game.units[side].x - prev[side].x;
        const dy = game.units[side].y - prev[side].y;
        if (dx || dy) facing[side] = { dx, dy };
      }
      updateHud();
    }
    if (isOver(game)) finishMatch(now);
  } else if (finishedAt !== null && !paused && now - finishedAt > PAUSE_BETWEEN_MS) {
    startMatch();
  }

  effects = effects.filter((e) => now - e.born < 1000);
  const t = isOver(game) ? 1 : Math.min(acc / tickMs, 1);
  renderer.draw({ game, prev, t, effects, now, facing });
  requestAnimationFrame(frame);
}

function finishMatch(now) {
  if (finishedAt !== null) return;
  finishedAt = now;
  const w = winner(game);
  tally[w] += 1;
  const { red, blue } = game.units;
  const overlay = $("overlay");
  overlay.innerHTML =
    w === "draw"
      ? `Draw<small>${red.score} – ${blue.score}</small>`
      : `<span style="color:${TEAM_COLOR[w]}">${w === "red" ? "Red" : "Blue"} wins</span><small>${red.score} – ${blue.score} · next match soon</small>`;
  overlay.hidden = false;
  $("tally").textContent = `This session: Red ${tally.red} · Blue ${tally.blue} · Draws ${tally.draw}`;
}

function updateHud() {
  $("score-red").textContent = game.units.red.score;
  $("score-blue").textContent = game.units.blue.score;
  $("tick").textContent = `tick ${game.tick} / ${game.config.maxTicks}`;
  $("bar").style.width = `${(100 * game.tick) / game.config.maxTicks}%`;
}

// ---------- controls ----------

$("pause").addEventListener("click", () => {
  paused = !paused;
  $("pause").textContent = paused ? "Play" : "Pause";
});
$("speed").addEventListener("click", () => {
  speedIndex = (speedIndex + 1) % SPEEDS.length;
  $("speed").textContent = `Speed ${SPEEDS[speedIndex]}×`;
});
$("new").addEventListener("click", () => startMatch());
window.addEventListener("resize", () => renderer.resize());

// Version label + link. Old versions live at <site>/versions/<tag>/ (see tools/build-site.js).
const path = location.pathname;
const inVersions = path.indexOf("/versions/");
$("versions-link").href = (inVersions >= 0 ? path.slice(0, inVersions + 1) : path.replace(/[^/]*$/, "")) + "versions/";
fetch("version.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((v) => { if (v) $("version-label").textContent = `· ${v.label}${v.commit ? ` (${v.commit})` : ""}`; })
  .catch(() => {});

const seedParam = Number(new URLSearchParams(location.search).get("seed"));
startMatch(Number.isFinite(seedParam) && seedParam > 0 ? seedParam : undefined);
requestAnimationFrame(frame);
