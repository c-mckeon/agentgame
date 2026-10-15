// Game settings. The game master changes rules here (and in game.js).
// Bump RULES_VERSION whenever behaviour changes, and update RULES.md.

export const RULES_VERSION = 1;

export const CONFIG = {
  width: 15,        // columns; red starts on the left, blue on the right
  height: 11,       // rows
  maxTicks: 200,    // game length
  startCoins: 3,    // coins on the board at tick 0
  maxCoins: 5,      // never more than this many at once
  spawnChance: 0.3, // chance per tick to spawn a coin (if below maxCoins)
};
