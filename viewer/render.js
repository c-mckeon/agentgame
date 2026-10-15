// Draws the board as a small 3D island: a perspective ground plane with a grassy
// top, a dirt cliff at the front, water all around, and objects drawn back-to-front.
// The playable grid is surrounded by a one-tile decorative border (trees, rocks, huts).

import { SIDES } from "../engine/game.js";
import { createRng } from "../engine/rng.js";

export const TEAM = {
  red: { main: "#e8484a", light: "#ff9a8f", dark: "#8e1f23", pad: "hsl(4, 32%, 52%)" },
  blue: { main: "#3d8bfd", light: "#9cc8ff", dark: "#1b4a91", pad: "hsl(214, 32%, 52%)" },
};

// Fractions of a tick: when a hopping unit "lands" on its new cell, and how long
// a picked-up coin takes to fly onto its head.
export const LAND = 0.55;
const FLY = 0.4;

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  const terrain = document.createElement("canvas");
  const tctx = terrain.getContext("2d");

  let config, cols, rows, cell, D, camH, horizonY, cssW, cssH;
  let tiles = [], decor = [], waves = [], homes = {};

  // ---------- setup ----------

  function setMatch(game) {
    config = game.config;
    homes = game.home;
    cols = config.width + 2; // +1 border tile on each side
    rows = config.height + 2;
    buildScenery(game.seed);
    resize();
  }

  function buildScenery(seed) {
    const rng = createRng((seed ^ 0x5eed1e) >>> 0);
    const r = (a, b) => a + rng.next() * (b - a);
    const midV = Math.floor(config.height / 2) + 1;

    tiles = [];
    for (let v = 0; v < rows; v++) {
      for (let u = 0; u < cols; u++) {
        const tufts = Array.from({ length: 5 }, () => ({ fx: r(0.1, 0.9), fy: r(0.15, 0.95) }));
        const flowers = rng.next() < 0.18
          ? [{ fx: r(0.2, 0.8), fy: r(0.2, 0.8), color: rng.next() < 0.5 ? "#fff6d6" : "#ffd84d" }]
          : [];
        tiles.push({ u, v, shade: rng.next(), tufts, flowers });
      }
    }

    decor = [
      { kind: "hut", side: "red", u: 0.5, v: midV + 0.55 },
      { kind: "hut", side: "blue", u: cols - 0.5, v: midV + 0.55 },
    ];
    for (let v = 0; v < rows; v++) {
      for (let u = 0; u < cols; u++) {
        const border = u === 0 || u === cols - 1 || v === 0 || v === rows - 1;
        if (!border || ((u === 0 || u === cols - 1) && Math.abs(v - midV) <= 1)) continue;
        const roll = rng.next();
        const at = { u: u + r(0.3, 0.7), v: v + r(0.4, 0.8), size: r(0.8, 1.2) };
        if (v === rows - 1) {
          // Near edge: keep it low so nothing hides the players.
          if (roll < 0.3) decor.push({ kind: "bush", ...at });
          else if (roll < 0.5) decor.push({ kind: "rock", ...at });
        } else if (v === 0) {
          decor.push({ kind: roll < 0.8 ? "tree" : "bush", ...at });
        } else if (roll < 0.55) decor.push({ kind: "tree", ...at });
        else if (roll < 0.75) decor.push({ kind: "rock", ...at });
        else if (roll < 0.9) decor.push({ kind: "bush", ...at });
      }
    }

    waves = Array.from({ length: 40 }, () => ({ x: rng.next(), y: rng.next(), len: r(8, 22), speed: r(4, 12) }));
  }

  function resize() {
    if (!config) return;
    cssW = canvas.clientWidth || 720;
    cell = cssW / (cols + 1.6);
    D = 2.4 * rows;               // camera distance: larger = flatter perspective
    camH = 0.62 * (D + rows);     // camera height: board depth on screen ≈ 0.62 × its row count
    const top = 1.7 * cell;
    const depth = 0.62 * rows * cell;
    const nearY = top + depth;
    horizonY = nearY - camH * cell;
    cssH = nearY + 0.9 * cell + 0.8 * cell;

    const dpr = window.devicePixelRatio || 1;
    for (const c of [canvas, terrain]) {
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTerrain();
  }

  /** World (u, v) in tile units, plus height h in tiles → screen point and scale. */
  function project(u, v, h = 0) {
    const s = D / (D + (rows - v));
    return { x: cssW / 2 + (u - cols / 2) * cell * s, y: horizonY + (camH - h) * cell * s, s };
  }

  /** Board cell (x, y) → world coordinates of its centre. */
  const W = (x, y) => ({ u: x + 1.5, v: y + 1.5 });

  // ---------- static terrain (drawn once per resize) ----------

  function drawTerrain() {
    const g = tctx;
    g.clearRect(0, 0, cssW, cssH);
    const rng = createRng(7);

    // Front cliff.
    const L = project(0, rows);
    const R = project(cols, rows);
    const cliff = 0.9 * cell;
    const grad = g.createLinearGradient(0, L.y, 0, L.y + cliff);
    grad.addColorStop(0, "#8a5a36");
    grad.addColorStop(1, "#5b3a22");
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(L.x, L.y);
    g.lineTo(R.x, R.y);
    const bumps = 24;
    for (let i = 0; i <= bumps; i++) {
      const x = R.x - ((R.x - L.x) * i) / bumps;
      g.lineTo(x, L.y + cliff - rng.next() * cell * 0.18);
    }
    g.closePath();
    g.fill();
    // Rock strata and pebbles.
    g.strokeStyle = "rgba(0,0,0,0.18)";
    g.lineWidth = 1;
    for (const f of [0.38, 0.62]) {
      g.beginPath();
      for (let i = 0; i <= bumps; i++) {
        const x = L.x + ((R.x - L.x) * i) / bumps;
        const y = L.y + cliff * f + Math.sin(i * 1.7) * cell * 0.04;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = rng.next() < 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.15)";
      ellipse(g, L.x + rng.next() * (R.x - L.x), L.y + cliff * (0.2 + rng.next() * 0.65), cell * 0.06, cell * 0.04);
    }
    // Grass overhang along the top of the cliff.
    g.fillStyle = "#3f7d2e";
    g.beginPath();
    g.moveTo(L.x, L.y);
    g.lineTo(R.x, R.y);
    for (let i = 0; i <= bumps * 2; i++) {
      const x = R.x - ((R.x - L.x) * i) / (bumps * 2);
      g.lineTo(x, L.y + cell * (0.1 + (i % 2) * 0.08));
    }
    g.closePath();
    g.fill();

    // Grass tiles, with stone pads on each side's home tiles.
    for (const t of tiles) {
      const { u, v } = t;
      const border = u === 0 || u === cols - 1 || v === 0 || v === rows - 1;
      const home = SIDES.find((s) => homes[s].some((h) => h.x === u - 1 && h.y === v - 1));
      const checker = (u + v) % 2 ? 2.5 : 0;
      const light = border ? 34 + t.shade * 4 : 41 + t.shade * 4 + checker;
      g.fillStyle = `hsl(${border ? 96 : 102}, ${border ? 40 : 46}%, ${light}%)`;
      quad(g, u, v);
      g.fill();
      if (!border) {
        g.strokeStyle = "rgba(20,50,10,0.10)";
        g.lineWidth = 1;
        g.stroke();
      }
      if (home) {
        g.fillStyle = TEAM[home].pad;
        quad(g, u + 0.08, v + 0.08, 0.84);
        g.fill();
        g.strokeStyle = TEAM[home].dark;
        g.lineWidth = 1.5;
        g.stroke();
        continue;
      }
      for (const f of t.tufts) {
        const p = project(u + f.fx, v + f.fy);
        const k = cell * p.s * 0.08;
        g.strokeStyle = "rgba(30,70,20,0.28)";
        g.lineWidth = Math.max(1, k * 0.35);
        g.beginPath();
        g.moveTo(p.x - k, p.y - k * 1.6);
        g.lineTo(p.x, p.y);
        g.lineTo(p.x + k, p.y - k * 1.6);
        g.stroke();
      }
      for (const f of t.flowers) {
        const p = project(u + f.fx, v + f.fy);
        g.fillStyle = f.color;
        ellipse(g, p.x, p.y, cell * p.s * 0.045, cell * p.s * 0.035);
      }
    }
  }

  function quad(g, u, v, size = 1) {
    const a = project(u, v), b = project(u + size, v), c = project(u + size, v + size), d = project(u, v + size);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(c.x, c.y);
    g.lineTo(d.x, d.y);
    g.closePath();
  }

  // ---------- per-frame drawing ----------

  /**
   * frame = { game, prev, t, effects, now, facing, tickMs }
   *   prev:    unit positions before the current tick (for interpolation)
   *   t:       0..1 progress through the current tick
   *   effects: engine events stamped with `born` (ms), newest last
   *   facing:  { red: {dx, dy}, blue: {dx, dy} } last movement direction
   */
  function draw({ game, prev, t, effects, now, facing, tickMs }) {
    drawWater(now);
    ctx.drawImage(terrain, 0, 0, cssW, cssH);

    const age = (e) => (now - e.born) / tickMs; // in ticks
    const landed = (e) => age(e) >= LAND;

    // Traps lie flat on the ground, under everything else.
    for (const tr of game.traps) drawTrap(tr, now);
    for (const e of effects) if (e.type === "trap-set" && age(e) < 2) drawRing(e.x, e.y, age(e) / 2, TEAM[e.side].main);

    // Where each unit is drawn this frame.
    const k = ease(t);
    const pos = {};
    for (const side of SIDES) {
      const a = prev[side], b = game.units[side];
      pos[side] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, moving: a.x !== b.x || a.y !== b.y };
    }
    const close = Math.abs(pos.red.x - pos.blue.x) < 0.6 && Math.abs(pos.red.y - pos.blue.y) < 0.6;
    for (const side of SIDES) pos[side].nudge = close ? (side === "red" ? -0.22 : 0.22) : 0;
    const headOf = (side) => {
      const w = W(pos[side].x, pos[side].y);
      return { u: w.u + pos[side].nudge, v: w.v };
    };

    const items = decor.map((d) => ({ v: d.v, draw: () => drawDecor(d, now) }));

    for (const c of game.coins) {
      // Coins scattered by a trap arc out from where the unit was caught.
      const drop = findLast(effects, (e) => e.type === "drop" && e.x === c.x && e.y === c.y && age(e) < LAND + 1.5);
      const spawn = findLast(effects, (e) => e.type === "spawn" && e.x === c.x && e.y === c.y);
      const grow = spawn ? Math.min(age(spawn) / 1.5, 1) : 1;
      if (drop && !landed(drop)) continue; // still on the victim's head
      if (drop) {
        const f = ease((age(drop) - LAND) / 1.5);
        const from = W(drop.from.x, drop.from.y), to = W(c.x, c.y);
        const u = from.u + (to.u - from.u) * f, v = from.v + (to.v - from.v) * f;
        items.push({ v, draw: () => drawCoin(u, v, 1, now, c.x * 1.3 + c.y, Math.sin(Math.PI * f) * 1.2) });
      } else {
        const w = W(c.x, c.y);
        items.push({ v: w.v, draw: () => drawCoin(w.u, w.v, grow, now, c.x * 1.3 + c.y) });
      }
    }

    // Picked-up coins stay put until the unit lands on them, then fly onto its head.
    for (const e of effects) {
      if (e.type !== "collect" || age(e) >= LAND + FLY) continue;
      const w = W(e.x, e.y);
      if (!landed(e)) {
        items.push({ v: w.v, draw: () => drawCoin(w.u, w.v, 1, now, e.x * 1.3 + e.y) });
      } else {
        const f = (age(e) - LAND) / FLY;
        const h = headOf(e.side);
        const u = w.u + (h.u - w.u) * f, v = w.v + (h.v - w.v) * f;
        items.push({ v: v + 0.01, draw: () => drawCoin(u, v, 1 - f * 0.5, now, 0, 0.3 + f * 0.9) });
      }
    }

    for (const side of SIDES) {
      const p = pos[side];
      const u = game.units[side];
      const hop = p.moving ? Math.sin(Math.PI * t) * 0.3 : 0;
      const carry = shownCarry(game, effects, side, age);
      const w = W(p.x, p.y);
      items.push({
        v: w.v,
        draw: () => drawUnit(w.u + p.nudge, w.v, hop, side, facing[side], now, carry, u.stun > 0 && !(prev[side].x !== u.x && t < LAND)),
      });
    }

    items.sort((a, b) => a.v - b.v);
    for (const it of items) it.draw();

    // Bursts and popups on top.
    for (const e of effects) {
      const a = age(e);
      if (e.type === "trap-hit" && a >= LAND && a < LAND + 2) drawBurst(e.x, e.y, (a - LAND) / 2);
      if (e.type === "collect" && a >= LAND + FLY && a < LAND + FLY + 3) {
        const h = headOf(e.side);
        popup("+1", h.u, h.v, 1.3, (a - LAND - FLY) / 3, TEAM[e.side].light, 0.38);
      }
      if (e.type === "bank" && a >= LAND && a < LAND + 5) {
        const w = W(e.x, e.y);
        popup(`+${e.amount}`, w.u, w.v, 1.2, (a - LAND) / 5, "#ffe066", 0.62);
      }
      if (e.type === "trap-set" && a < 4) {
        const w = W(e.x, e.y);
        popup(`-${e.cost}`, w.u, w.v, 1.3, a / 4, "#d7dbe3", 0.34);
      }
    }
  }

  function popup(text, u, v, h, f, color, size) {
    const p = project(u, v, h + f * 0.9);
    ctx.globalAlpha = Math.max(0, 1 - f);
    ctx.font = `800 ${Math.round(cell * p.s * size)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.strokeText(text, p.x, p.y);
    ctx.fillStyle = color;
    ctx.fillText(text, p.x, p.y);
    ctx.globalAlpha = 1;
  }

  function drawWater(now) {
    const grad = ctx.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, "#1d5d86");
    grad.addColorStop(1, "#2b7fae");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.5;
    for (const w of waves) {
      const x = ((w.x * cssW + (now / 1000) * w.speed) % (cssW + 40)) - 20;
      const y = w.y * cssH;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w.len / 2, y - 3, x + w.len, y);
      ctx.stroke();
    }

    // Foam where the island meets the water.
    const a = project(0, 0), b = project(cols, 0), c = project(cols, rows), d = project(0, rows);
    const cliff = 0.9 * cell;
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.15 * Math.sin(now / 600)})`;
    ctx.lineWidth = 5 + 2 * Math.sin(now / 450);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x, c.y + cliff * 0.9);
    ctx.lineTo(d.x, d.y + cliff * 0.9);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.stroke();
  }

  function drawUnit(u, v, hop, side, facing, now, carry, stunned) {
    const g = project(u, v);
    const s = cell * g.s;
    const r = 0.36 * s;
    const team = TEAM[side];

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ellipse(ctx, g.x, g.y, r * (1 - hop * 0.6), r * 0.38 * (1 - hop * 0.6));

    const bob = hop > 0 || stunned ? 0 : Math.sin(now / 260 + (side === "red" ? 0 : 2)) * 0.02;
    const squash = carry >= config.heavyAt ? 0.9 : 1; // heavy loads squash the body a little
    const cx = g.x;
    const cy = g.y - (hop + bob) * s - r * 0.95 * squash;

    const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.1);
    body.addColorStop(0, team.light);
    body.addColorStop(0.55, team.main);
    body.addColorStop(1, team.dark);
    ctx.fillStyle = body;
    ellipse(ctx, cx, cy, r * (2 - squash), r * 1.05 * squash);
    ctx.strokeStyle = team.dark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes look where the unit last moved; walking away (north) shows its back.
    const { dx, dy } = facing;
    if (stunned) {
      ctx.strokeStyle = "#1b1b24";
      ctx.lineWidth = Math.max(1.5, r * 0.09);
      for (const sgn of [-1, 1]) {
        const ex = cx + sgn * r * 0.3, ey = cy - r * 0.15, k = r * 0.12;
        ctx.beginPath();
        ctx.moveTo(ex - k, ey - k); ctx.lineTo(ex + k, ey + k);
        ctx.moveTo(ex + k, ey - k); ctx.lineTo(ex - k, ey + k);
        ctx.stroke();
      }
      // Dizzy stars.
      for (let i = 0; i < 3; i++) {
        const ang = now / 250 + (i * Math.PI * 2) / 3;
        star(cx + Math.cos(ang) * r * 0.9, cy - r * 1.25 + Math.sin(ang) * r * 0.25, r * 0.16);
      }
    } else if (!(dy < 0 && dx === 0)) {
      const spread = r * (dx ? 0.22 : 0.3);
      const ex = cx + dx * r * 0.35;
      const ey = cy - r * 0.15 + dy * r * 0.12;
      for (const sgn of [-1, 1]) {
        ctx.fillStyle = "#fff";
        ellipse(ctx, ex + sgn * spread, ey, r * 0.17, r * 0.22);
        ctx.fillStyle = "#1b1b24";
        ellipse(ctx, ex + sgn * spread + dx * r * 0.06, ey + dy * r * 0.05, r * 0.08, r * 0.11);
      }
    }

    // Carried coins stacked on the head.
    const top = cy - r * 1.05 * squash;
    const shown = Math.min(carry, 6);
    for (let i = 0; i < shown; i++) {
      const y = top - r * 0.08 - i * r * 0.2;
      ctx.fillStyle = "#ffcc33";
      ellipse(ctx, cx, y, r * 0.34, r * 0.12);
      ctx.strokeStyle = "#a8721a";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (carry > 6) {
      ctx.font = `800 ${Math.round(r * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffe066";
      ctx.fillText(`×${carry}`, cx + r * 0.45, top - r * 0.9);
    }
  }

  function drawCoin(u, v, grow, now, phase, lift = 0) {
    const h = 0.3 + 0.06 * Math.sin(now / 320 + phase) + lift;
    const g = project(u, v);
    const p = project(u, v, h);
    const r = 0.26 * cell * g.s * grow;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ellipse(ctx, g.x, g.y, r * 0.8, r * 0.3);
    const w = r * Math.max(0.18, Math.abs(Math.cos(now / 380 + phase)));
    ctx.shadowColor = "rgba(255,210,80,0.8)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffcc33";
    ellipse(ctx, p.x, p.y, w, r);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#b9801a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "#ffe9a3";
    ctx.lineWidth = 1;
    ellipse(ctx, p.x, p.y, w * 0.6, r * 0.6, false);
    ctx.stroke();
  }

  /** A sprung-jaw trap in the owner's colour. Bots can't see the enemy's; viewers see all. */
  function drawTrap(tr, now) {
    const w = W(tr.x, tr.y);
    const g = project(w.u, w.v);
    const s = cell * g.s;
    const team = TEAM[tr.owner];
    const glow = 0.7 + 0.2 * Math.sin(now / 400 + tr.x);
    ctx.globalAlpha = glow;
    ctx.fillStyle = "rgba(20,20,24,0.6)";
    ellipse(ctx, g.x, g.y, s * 0.36, s * 0.14);
    ctx.strokeStyle = team.main;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Teeth.
    ctx.fillStyle = "#d9dde3";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = g.x + Math.cos(a) * s * 0.27, y = g.y + Math.sin(a) * s * 0.1;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.03, y);
      ctx.lineTo(x + s * 0.03, y);
      ctx.lineTo(x, y - s * 0.09);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRing(x, y, f, color) {
    const w = W(x, y);
    const g = project(w.u, w.v);
    const s = cell * g.s;
    ctx.globalAlpha = 1 - f;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ellipse(ctx, g.x, g.y, s * (0.2 + f * 0.5), s * (0.08 + f * 0.2), false);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBurst(x, y, f) {
    const w = W(x, y);
    const g = project(w.u, w.v, 0.4);
    const s = cell * g.s;
    ctx.globalAlpha = 1 - f;
    ctx.strokeStyle = "#ffb347";
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r0 = s * (0.15 + f * 0.4), r1 = s * (0.3 + f * 0.7);
      ctx.beginPath();
      ctx.moveTo(g.x + Math.cos(a) * r0, g.y + Math.sin(a) * r0 * 0.6);
      ctx.lineTo(g.x + Math.cos(a) * r1, g.y + Math.sin(a) * r1 * 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function star(x, y, r) {
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawDecor(d, now) {
    const g = project(d.u, d.v);
    const s = cell * g.s * (d.size ?? 1);

    if (d.kind === "tree") {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ellipse(ctx, g.x, g.y, s * 0.3, s * 0.1);
      ctx.fillStyle = "#6b4528";
      ctx.fillRect(g.x - s * 0.05, g.y - s * 0.38, s * 0.1, s * 0.38);
      const blobs = [[0, -0.62, 0.3, "#2f6b2a"], [-0.15, -0.48, 0.22, "#356f2c"], [0.16, -0.5, 0.23, "#3c7a30"], [0.02, -0.78, 0.2, "#4a8c39"]];
      for (const [bx, by, br, col] of blobs) {
        ctx.fillStyle = col;
        ellipse(ctx, g.x + bx * s, g.y + by * s, br * s, br * s);
      }
    } else if (d.kind === "bush") {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ellipse(ctx, g.x, g.y, s * 0.2, s * 0.07);
      ctx.fillStyle = "#3a7a2f";
      ellipse(ctx, g.x - s * 0.07, g.y - s * 0.08, s * 0.13, s * 0.11);
      ctx.fillStyle = "#468c38";
      ellipse(ctx, g.x + s * 0.07, g.y - s * 0.1, s * 0.12, s * 0.11);
    } else if (d.kind === "rock") {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ellipse(ctx, g.x, g.y, s * 0.18, s * 0.06);
      ctx.fillStyle = "#8a8f96";
      ellipse(ctx, g.x, g.y - s * 0.06, s * 0.16, s * 0.1);
      ctx.fillStyle = "#b3b8be";
      ellipse(ctx, g.x - s * 0.04, g.y - s * 0.1, s * 0.07, s * 0.04);
    } else if (d.kind === "hut") {
      const team = TEAM[d.side];
      const w = s * 0.72, h = s * 0.42;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ellipse(ctx, g.x, g.y, w * 0.65, s * 0.12);
      ctx.fillStyle = "#e9d6ae";
      ctx.fillRect(g.x - w / 2, g.y - h, w, h);
      ctx.strokeStyle = "#9b8461";
      ctx.lineWidth = 1;
      ctx.strokeRect(g.x - w / 2, g.y - h, w, h);
      ctx.fillStyle = "#5a3d24";
      ctx.fillRect(g.x - w * 0.12, g.y - h * 0.62, w * 0.24, h * 0.62);
      const apex = g.y - h - s * 0.4;
      ctx.fillStyle = team.main;
      ctx.beginPath();
      ctx.moveTo(g.x - w * 0.64, g.y - h);
      ctx.lineTo(g.x + w * 0.64, g.y - h);
      ctx.lineTo(g.x, apex);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = team.dark;
      ctx.stroke();
      // Waving flag.
      const top = apex - s * 0.38;
      const dir = d.side === "red" ? 1 : -1;
      ctx.strokeStyle = "#4a3a2a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.x, apex);
      ctx.lineTo(g.x, top);
      ctx.stroke();
      const wave = Math.sin(now / 220) * s * 0.03;
      ctx.fillStyle = team.main;
      ctx.beginPath();
      ctx.moveTo(g.x, top);
      ctx.quadraticCurveTo(g.x + dir * s * 0.12, top + wave, g.x + dir * s * 0.26, top + s * 0.05 + wave);
      ctx.lineTo(g.x, top + s * 0.15);
      ctx.closePath();
      ctx.fill();
    }
  }

  return { setMatch, resize, draw };
}

/**
 * What the viewer should show as carried / banked right now: the engine updates
 * instantly at the start of a tick, but the animation only "arrives" at LAND.
 */
export function shownCarry(game, effects, side, age) {
  let carry = game.units[side].carry;
  for (const e of effects) {
    if (e.side !== side) continue;
    if (e.type === "collect" && age(e) < LAND + FLY) carry -= 1;
    if (e.type === "bank" && age(e) < LAND) carry += e.amount;
    if (e.type === "trap-hit" && age(e) < LAND) carry += e.carried;
  }
  return Math.max(0, carry);
}

export function shownScore(game, effects, side, age) {
  let score = game.units[side].score;
  for (const e of effects) if (e.type === "bank" && e.side === side && age(e) < LAND) score -= e.amount;
  return score;
}

const ease = (t) => t * t * (3 - 2 * t);

function findLast(list, pred) {
  for (let i = list.length - 1; i >= 0; i--) if (pred(list[i])) return list[i];
  return null;
}

function ellipse(g, x, y, rx, ry, fill = true) {
  g.beginPath();
  g.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
  if (fill) g.fill();
}
