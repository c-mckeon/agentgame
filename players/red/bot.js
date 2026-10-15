// RED's bot. Only Red may change this file.
//
// decide(view) is called once per tick and returns "N", "S", "E", "W", "STAY" or "TRAP".
// You always see yourself as the WEST (left) player; the engine handles mirroring.
// createBot() is called once per match, so the returned object may keep state.

export default function createBot() {
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const nearest = (from, list) => list.reduce((best, p) => (dist(from, p) < dist(from, best) ? p : best));
  const bad = new Set(); // cells where Blue paid for a trap (its score dropped while standing there)
  let prev = null;
  const D = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
  const stepTo = (from, to) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const opts = [];
    if (dx) opts.push(dx > 0 ? "E" : "W");
    if (dy) opts.push(dy > 0 ? "S" : "N");
    if (Math.abs(dy) > Math.abs(dx)) opts.reverse();
    return opts.find((o) => !bad.has(from.x + D[o][0] + "," + (from.y + D[o][1]))) || opts[0] || "STAY";
  };

  return {
    decide(view) {
      const { me, opp, coins, myHome, tick, maxTicks } = view;
      if (prev && opp.score < prev.score) bad.add(prev.x + "," + prev.y);
      prev = { x: opp.pos.x, y: opp.pos.y, score: opp.score };
      const home = nearest(me.pos, myHome);

      // Bank at 2: a 3rd coin makes us heavy and halves our speed home. Traps cost more than they win, so none.
      const timeLeft = maxTicks - tick;
      if (me.carry >= 2 || (me.carry > 0 && timeLeft <= dist(me.pos, home) * 2 + 4)) return stepTo(me.pos, home);

      if (coins.length === 0) return me.carry > 0 ? stepTo(me.pos, home) : "STAY";
      return stepTo(me.pos, nearest(me.pos, coins));
    },
  };
}
