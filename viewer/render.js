// Draws the board as a small 3D island: a perspective ground plane with a grassy
// top, a dirt cliff at the front, water all around, and objects drawn back-to-front.
// The playable grid is surrounded by a one-tile decorative border (trees, rocks, huts).

import { SIDES } from "../engine/game.js";
import { createRng } from "../engine/rng.js";

const TEAM = {
  red: { main: "#e8484a", light: "#ff9a8f", dark: "#8e1f23" },
  blue: { main: "#3d8bfd", light: "#9cc8ff", dark: "#1b4a91" },
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  const terrain = document.createElement("canvas");
  const tctx = terrain.getContext("2d");

  let config, cols, rows, cell, D, camH, horizonY, cssW, cssH;
  let tiles = [], decor = [], waves = [];

  // ---------- setup ----------

  function setMatch(game) {
    config = game.config;
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

    // Grass tiles.
    for (const t of tiles) {
      const { u, v } = t;
      const border = u === 0 || u === cols - 1 || v === 0 || v === rows - 1;
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

  function quad(g, u, v) {
    const a = project(u, v), b = project(u + 1, v), c = project(u + 1, v + 1), d = project(u, v + 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(c.x, c.y);
    g.lineTo(d.x, d.y);
    g.closePath();
  }

  // ---------- per-frame drawing ----------

  /**
   * frame = { game, prev, t, effects, now, facing }
   *   prev:   unit positions before the current tick (for interpolation)
   *   t:      0..1 progress through the current tick
   *   facing: { red: {dx, dy}, blue: {dx, dy} } last movement direction
   */
  function draw({ game, prev, t, effects, now, facing }) {
    drawWater(now);
    ctx.drawImage(terrain, 0, 0, cssW, cssH);

    const items = decor.map((d) => ({ v: d.v, draw: () => drawDecor(d, now) }));

    for (const c of game.coins) {
      const spawn = effects.find((e) => e.type === "spawn" && e.x === c.x && e.y === c.y);
      const grow = spawn ? Math.min((now - spawn.born) / 300, 1) : 1;
      items.push({ v: c.y + 1.5, draw: () => drawCoin(c.x + 1.5, c.y + 1.5, grow, now, c.x * 1.3 + c.y) });
    }

    const k = ease(t);
    const pos = {};
    for (const side of SIDES) {
      const a = prev[side], b = game.units[side];
      pos[side] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, moving: a.x !== b.x || a.y !== b.y };
    }
    // Sharing a cell: stand side by side instead of on top of each other.
    const close = Math.abs(pos.red.x - pos.blue.x) < 0.6 && Math.abs(pos.red.y - pos.blue.y) < 0.6;
    for (const side of SIDES) {
      const p = pos[side];
      const nudge = close ? (side === "red" ? -0.22 : 0.22) : 0;
      const hop = p.moving ? Math.sin(Math.PI * t) * 0.3 : 0;
      items.push({ v: p.y + 1.5, draw: () => drawUnit(p.x + 1.5 + nudge, p.y + 1.5, hop, side, facing[side], now) });
    }

    items.sort((a, b) => a.v - b.v);
    for (const it of items) it.draw();

    // "+1" popups.
    for (const e of effects) {
      if (e.type !== "collect") continue;
      const age = (now - e.born) / 900;
      if (age >= 1) continue;
      const p = project(e.x + 1.5, e.y + 1.5, 0.9 + age * 0.9);
      ctx.globalAlpha = 1 - age;
      ctx.font = `800 ${Math.round(cell * p.s * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.strokeText("+1", p.x, p.y);
      ctx.fillStyle = TEAM[e.side].light;
      ctx.fillText("+1", p.x, p.y);
      ctx.globalAlpha = 1;
    }
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

  function drawUnit(u, v, hop, side, facing, now) {
    const g = project(u, v);
    const s = cell * g.s;
    const r = 0.36 * s;
    const team = TEAM[side];

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ellipse(ctx, g.x, g.y, r * (1 - hop * 0.6), r * 0.38 * (1 - hop * 0.6));

    const bob = hop > 0 ? 0 : Math.sin(now / 260 + (side === "red" ? 0 : 2)) * 0.02;
    const cx = g.x;
    const cy = g.y - (hop + bob) * s - r * 0.95;

    const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.1);
    body.addColorStop(0, team.light);
    body.addColorStop(0.55, team.main);
    body.addColorStop(1, team.dark);
    ctx.fillStyle = body;
    ellipse(ctx, cx, cy, r, r * 1.05);
    ctx.strokeStyle = team.dark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes look where the unit last moved; walking away (north) shows its back.
    const { dx, dy } = facing;
    if (dy < 0 && dx === 0) return;
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

  function drawCoin(u, v, grow, now, phase) {
    const h = 0.3 + 0.06 * Math.sin(now / 320 + phase);
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

const ease = (t) => t * t * (3 - 2 * t);

function ellipse(g, x, y, rx, ry, fill = true) {
  g.beginPath();
  g.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
  if (fill) g.fill();
}
