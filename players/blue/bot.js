// BLUE's bot. Only Blue may change this file.
//
// decide(view) is called once per tick and returns "N", "S", "E", "W", "STAY" or "TRAP".
// You always see yourself as the WEST (left) player; the engine handles mirroring.
// createBot() is called once per match, so the returned object may keep state.

export default function createBot() {
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const nearest = (from, list) => list.reduce((best, p) => (dist(from, p) < dist(from, best) ? p : best));
  const enemyTraps = []; // inferred: opponent's score drops only when it lays a trap where it stands
  let lastOpp = null;
  const isTrap = (p) => enemyTraps.some((t) => t.x === p.x && t.y === p.y);
  const move = (p, d) => ({ x: p.x + (d === "E") - (d === "W"), y: p.y + (d === "S") - (d === "N") });
  const stepTo = (from, to) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const opts = [];
    if (dx !== 0) opts.push(dx > 0 ? "E" : "W");
    if (dy !== 0) opts.push(dy > 0 ? "S" : "N");
    if (Math.abs(dy) > Math.abs(dx)) opts.reverse();
    const safe = opts.filter((d) => !isTrap(move(from, d)));
    return safe[0] || (opts.length ? ["N", "S", "E", "W"].find((d) => !isTrap(move(from, d))) || "STAY" : "STAY");
  };

  return {
    decide(view) {
      const { me, opp, coins, myHome, tick, maxTicks } = view;
      if (lastOpp && opp.score < lastOpp.score && !isTrap(opp.pos)) enemyTraps.push({ ...opp.pos });
      lastOpp = { score: opp.score };
      const home = nearest(me.pos, myHome);

      // Bank once carrying 3, or when time is running out.
      const timeLeft = maxTicks - tick;
      if (me.carry >= 3 || (me.carry >= 2 && !coins.some((c) => !isTrap(c) && dist(me.pos, c) + dist(c, home) <= dist(me.pos, home) + 2)) || (me.carry > 0 && timeLeft <= dist(me.pos, home) * 2 + 4)) return stepTo(me.pos, home);

      // No traps: they cost banked points and rarely pay for themselves.
      const free = coins.filter((c) => !isTrap(c));
      if (free.length === 0) return me.carry > 0 ? stepTo(me.pos, home) : "STAY";
      const mine = free.filter((c) => dist(me.pos, c) <= dist(opp.pos, c));
      return stepTo(me.pos, nearest(me.pos, mine.length ? mine : free));
    },
  };
}
