// Coin Grab engine. Pure JavaScript, no DOM: runs in the browser and in Node.

import { CONFIG, RULES_VERSION } from "./config.js";
import { createRng } from "./rng.js";

export const SIDES = ["red", "blue"];
export const ACTIONS = ["N", "S", "E", "W", "STAY", "TRAP"];

const MOVES = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const other = (side) => (side === "red" ? "blue" : "red");

export function createGame(seed, config = CONFIG) {
  const mid = Math.floor(config.height / 2);
  const homeRows = Array.from({ length: config.homeSize }, (_, i) => mid - Math.floor(config.homeSize / 2) + i);
  const unit = (x) => ({ x, y: mid, score: 0, carry: 0, stun: 0, rest: 0, spent: 0 });
  const game = {
    seed,
    config,
    rng: createRng(seed),
    tick: 0,
    units: { red: unit(0), blue: unit(config.width - 1) },
    home: {
      red: homeRows.map((y) => ({ x: 0, y })),
      blue: homeRows.map((y) => ({ x: config.width - 1, y })),
    },
    coins: [],
    traps: [], // { x, y, owner }
  };
  for (let i = 0; i < config.startCoins; i++) spawnCoin(game);
  return game;
}

export function isOver(game) {
  return game.tick >= game.config.maxTicks;
}

/** Only banked coins count. Coins still being carried at the end are lost. */
export function winner(game) {
  const { red, blue } = game.units;
  if (red.score > blue.score) return "red";
  if (blue.score > red.score) return "blue";
  return "draw";
}

export function trapCost(game, side) {
  return game.config.trapBaseCost + game.traps.filter((t) => t.owner === side).length;
}

export function isHome(game, side, x, y) {
  return game.home[side].some((h) => h.x === x && h.y === y);
}

/**
 * What a bot sees. Every bot sees itself as the WEST (left) player:
 * blue's view is mirrored left-to-right, and its E/W actions are swapped back.
 * Enemy traps are invisible.
 */
export function buildView(game, side) {
  const { width, height, maxTicks, heavyAt, maxTraps, stunTicks } = game.config;
  const flip = side === "blue";
  const fx = (x) => (flip ? width - 1 - x : x);
  const pt = (p) => ({ x: fx(p.x), y: p.y });
  const me = game.units[side];
  const opp = game.units[other(side)];
  return deepFreeze({
    rulesVersion: RULES_VERSION,
    tick: game.tick,
    maxTicks,
    width,
    height,
    rules: { heavyAt, maxTraps, stunTicks },
    me: { pos: pt(me), score: me.score, carry: me.carry, stunned: me.stun, resting: me.rest },
    // Trap spending is hidden: the opponent sees your score before trap costs.
    opp: { pos: pt(opp), score: opp.score + opp.spent, carry: opp.carry, stunned: opp.stun },
    myHome: game.home[side].map(pt),
    oppHome: game.home[other(side)].map(pt),
    coins: game.coins.map(pt),
    myTraps: game.traps.filter((t) => t.owner === side).map(pt),
    trapCost: trapCost(game, side),
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
 * Advance one tick. `actions` are board actions: { red: "N", blue: "TRAP" }.
 * Returns events for the viewer.
 */
export function step(game, actions) {
  const { width, height, heavyAt, maxTraps, stunTicks } = game.config;
  const events = [];
  const moved = {};

  // 1. Stunned units can't act; resting (heavy) units can't move.
  const act = {};
  for (const side of SIDES) {
    const u = game.units[side];
    let a = actions[side] ?? "STAY";
    if (u.stun > 0) {
      u.stun -= 1;
      a = "STAY";
    } else if (u.rest > 0) {
      u.rest -= 1;
      if (MOVES[a]) a = "STAY";
    }
    act[side] = a;
  }

  // 2. Place traps (on the unit's current cell; the unit stays put).
  for (const side of SIDES) {
    if (act[side] !== "TRAP") continue;
    const u = game.units[side];
    const cost = trapCost(game, side);
    const mine = game.traps.filter((t) => t.owner === side).length;
    const blocked =
      isHome(game, "red", u.x, u.y) || isHome(game, "blue", u.x, u.y) ||
      game.traps.some((t) => t.x === u.x && t.y === u.y);
    if (u.score >= cost && mine < maxTraps && !blocked) {
      u.score -= cost;
      u.spent += cost;
      game.traps.push({ x: u.x, y: u.y, owner: side });
      events.push({ type: "trap-set", side, x: u.x, y: u.y, cost });
    }
  }

  // 3. Move. Units may share a cell. Moving while heavy means resting next tick.
  for (const side of SIDES) {
    const u = game.units[side];
    const d = MOVES[act[side]];
    if (!d) continue;
    const nx = clamp(u.x + d[0], 0, width - 1);
    const ny = clamp(u.y + d[1], 0, height - 1);
    if (nx === u.x && ny === u.y) continue;
    u.x = nx;
    u.y = ny;
    moved[side] = true;
    if (u.carry >= heavyAt) u.rest = 1;
  }

  // 4. Stepping onto an enemy trap: stunned, and carried coins scatter.
  const trapped = {};
  for (const side of SIDES) {
    if (!moved[side]) continue;
    const u = game.units[side];
    const i = game.traps.findIndex((t) => t.x === u.x && t.y === u.y && t.owner !== side);
    if (i < 0) continue;
    const trap = game.traps.splice(i, 1)[0];
    trapped[side] = true;
    u.stun = stunTicks;
    u.rest = 0;
    const dropped = scatter(game, u.x, u.y, u.carry);
    events.push({ type: "trap-hit", side, owner: trap.owner, x: u.x, y: u.y, carried: u.carry, lost: u.carry - dropped.length });
    for (const to of dropped) events.push({ type: "drop", from: { x: u.x, y: u.y }, x: to.x, y: to.y });
    u.carry = 0;
  }

  // 5. Pick up coins. If both units land on the same coin, a coin flip decides.
  game.coins = game.coins.filter((c) => {
    const here = SIDES.filter((s) => !trapped[s] && game.units[s].x === c.x && game.units[s].y === c.y);
    if (here.length === 0) return true;
    const side = here.length === 1 ? here[0] : here[game.rng.int(2)];
    game.units[side].carry += 1;
    events.push({ type: "collect", side, x: c.x, y: c.y });
    return false;
  });

  // 6. Bank carried coins on your own home tiles.
  for (const side of SIDES) {
    const u = game.units[side];
    if (u.carry > 0 && isHome(game, side, u.x, u.y)) {
      events.push({ type: "bank", side, amount: u.carry, x: u.x, y: u.y });
      u.score += u.carry;
      u.carry = 0;
    }
  }

  // 7. Maybe spawn a new coin.
  if (game.coins.length < game.config.maxCoins && game.rng.next() < game.config.spawnChance) {
    const c = spawnCoin(game);
    if (c) events.push({ type: "spawn", x: c.x, y: c.y });
  }

  game.tick += 1;
  return events;
}

function freeCell(game, x, y) {
  return (
    !game.coins.some((c) => c.x === x && c.y === y) &&
    !SIDES.some((s) => isHome(game, s, x, y))
  );
}

function spawnCoin(game) {
  const { width, height } = game.config;
  for (let tries = 0; tries < 50; tries++) {
    const x = game.rng.int(width);
    const y = game.rng.int(height);
    if (freeCell(game, x, y) && !SIDES.some((s) => game.units[s].x === x && game.units[s].y === y)) {
      const coin = { x, y };
      game.coins.push(coin);
      return coin;
    }
  }
  return null;
}

/** Drop `n` coins on free cells near (x, y). Returns where they landed. */
function scatter(game, x, y, n) {
  const { width, height, dropRadius } = game.config;
  const cells = [];
  for (let dy = -dropRadius; dy <= dropRadius; dy++) {
    for (let dx = -dropRadius; dx <= dropRadius; dx++) {
      const cx = x + dx, cy = y + dy;
      if ((dx || dy) && cx >= 0 && cy >= 0 && cx < width && cy < height && freeCell(game, cx, cy)) cells.push({ x: cx, y: cy });
    }
  }
  const landed = [];
  while (landed.length < n && cells.length) {
    const c = cells.splice(game.rng.int(cells.length), 1)[0];
    game.coins.push(c);
    landed.push(c);
  }
  return landed;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function deepFreeze(obj) {
  for (const v of Object.values(obj)) if (v && typeof v === "object") deepFreeze(v);
  return Object.freeze(obj);
}
