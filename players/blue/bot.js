// BLUE's bot. Only Blue may change this file.
//
// decide(view) is called once per tick and must return "N", "S", "E", "W" or "STAY".
// You always see yourself as the WEST (left) player; the engine handles mirroring.
// createBot() is called once per match, so the returned object may keep state.

export default function createBot() {
  return {
    decide(view) {
      const { me, coins } = view;
      if (coins.length === 0) return "STAY";

      // Walk towards the nearest coin.
      let target = coins[0];
      let best = Infinity;
      for (const c of coins) {
        const d = Math.abs(c.x - me.pos.x) + Math.abs(c.y - me.pos.y);
        if (d < best) {
          best = d;
          target = c;
        }
      }

      const dx = target.x - me.pos.x;
      const dy = target.y - me.pos.y;
      if (dx !== 0 && Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "E" : "W";
      if (dy !== 0) return dy > 0 ? "S" : "N";
      return "STAY";
    },
  };
}
