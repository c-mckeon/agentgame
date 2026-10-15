// RED's bot. Only Red may change this file.
//
// decide(view) is called once per tick and returns "N", "S", "E", "W", "STAY" or "TRAP".
// You always see yourself as the WEST (left) player; the engine handles mirroring.
// createBot() is called once per match, so the returned object may keep state.

export default function createBot() {
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const nearest = (from, list) => list.reduce((best, p) => (dist(from, p) < dist(from, best) ? p : best));
  const stepTo = (from, to) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    if (dx !== 0 && Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "E" : "W";
    if (dy !== 0) return dy > 0 ? "S" : "N";
    return "STAY";
  };

  return {
    decide(view) {
      const { me, coins, myHome, myTraps, trapCost, tick, maxTicks, width } = view;
      const home = nearest(me.pos, myHome);

      // Bank once carrying 3, or when time is running out.
      const timeLeft = maxTicks - tick;
      if (me.carry >= 3 || (me.carry > 0 && timeLeft <= dist(me.pos, home) * 2 + 4)) return stepTo(me.pos, home);

      // Lay a trap in the middle column when it's affordable.
      const onOwnTrap = myTraps.some((t) => t.x === me.pos.x && t.y === me.pos.y);
      if (me.pos.x === Math.floor(width / 2) && !onOwnTrap && myTraps.length < 2 && me.score >= trapCost + 3) return "TRAP";

      if (coins.length === 0) return me.carry > 0 ? stepTo(me.pos, home) : "STAY";
      return stepTo(me.pos, nearest(me.pos, coins));
    },
  };
}
