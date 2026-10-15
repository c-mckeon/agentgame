// Coin Grab engine. Pure JavaScript, no DOM: runs in the browser and in Node.

import { CONFIG, RULES_VERSION } from "./config.js";
import { createRng } from "./rng.js";

export const SIDES = ["red", "blue"];
export const ACTIONS = ["N", "S", "E", "W", "STAY"];

const MOVES = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0], STAY: [0, 0] };

export function createGame(seed, config = CONFIG) {
  const mid = Math.floor(config.height / 2);
  const game = {
    seed,
    config,
    rng: createRng(seed),
    tick: 0,
    units: {
      red: { x: 0, y: mid, score: 0 },
      blue: { x: config.width - 1, y: mid, score: 0 },
    },
    coins: [],
  };
  for (let i = 0; i < config.startCoins; i++) spawnCoin(game);
  return game;
}

export function isOver(game) {
  return game.tick >= game.config.maxTicks;
}

export function winner(game) {
  const { red, blue } = game.units;
  if (red.score > blue.score) return "red";
  if (blue.score > red.score) return "blue";
  return "draw";
}

/**
 * What a bot sees. Every bot sees itself as the WEST (left) player:
 * blue's view is mirrored left-to-right, and its E/W actions are swapped back.
 */
export function buildView(game, side) {
  const { width, height, maxTicks } = game.config;
  const flip = side === "blue";
  const fx = (x) => (flip ? width - 1 - x : x);
  const opp = side === "red" ? "blue" : "red";
  const unit = (u) => ({ pos: { x: fx(u.x), y: u.y }, score: u.score });
  return deepFreeze({
    rulesVersion: RULES_VERSION,
    tick: game.tick,
    maxTicks,
    width,
    height,
    me: unit(game.units[side]),
    opp: unit(game.units[opp]),
    coins: game.coins.map((c) => ({ x: fx(c.x), y: c.y })),
  });
}

/** Convert an action from a bot's (west-facing) point of view to the real board. */
export function toBoardAction(side, action) {
  if (!ACTIONS.includes(action)) return "STAY";
  if (side === "blue" && action === "E") return "W";
  if (side === "blue" && action === "W") return "E";
  return action;
}

/**
 * Advance one tick. `actions` are board actions: { red: "N", blue: "W" }.
 * Returns events for the viewer: [{ type: "collect", side, x, y }].
 */
export function step(game, actions) {
  const { width, height } = game.config;
  const events = [];

  // 1. Move both units at once. Units may share a cell.
  for (const side of SIDES) {
    const u = game.units[side];
    const [dx, dy] = MOVES[actions[side]] ?? MOVES.STAY;
    u.x = clamp(u.x + dx, 0, width - 1);
    u.y = clamp(u.y + dy, 0, height - 1);
  }

  // 2. Collect coins. If both units land on the same coin, a coin flip decides.
  game.coins = game.coins.filter((c) => {
    const here = SIDES.filter((s) => game.units[s].x === c.x && game.units[s].y === c.y);
    if (here.length === 0) return true;
    const side = here.length === 1 ? here[0] : here[game.rng.int(2)];
    game.units[side].score += 1;
    events.push({ type: "collect", side, x: c.x, y: c.y });
    return false;
  });

  // 3. Maybe spawn a new coin.
  if (game.coins.length < game.config.maxCoins && game.rng.next() < game.config.spawnChance) {
    const c = spawnCoin(game);
    if (c) events.push({ type: "spawn", x: c.x, y: c.y });
  }

  game.tick += 1;
  return events;
}

function spawnCoin(game) {
  const { width, height } = game.config;
  const taken = (x, y) =>
    game.coins.some((c) => c.x === x && c.y === y) ||
    SIDES.some((s) => game.units[s].x === x && game.units[s].y === y);
  for (let tries = 0; tries < 50; tries++) {
    const x = game.rng.int(width);
    const y = game.rng.int(height);
    if (!taken(x, y)) {
      const coin = { x, y };
      game.coins.push(coin);
      return coin;
    }
  }
  return null;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function deepFreeze(obj) {
  for (const v of Object.values(obj)) if (v && typeof v === "object") deepFreeze(v);
  return Object.freeze(obj);
}
