// Game settings. The game master changes rules here (and in game.js).
// Bump RULES_VERSION whenever behaviour changes, and update RULES.md.

export const RULES_VERSION = 2;

export const CONFIG = {
  width: 15,         // columns; red's home is on the left edge, blue's on the right
  height: 11,        // rows
  maxTicks: 240,     // game length
  homeSize: 3,       // home tiles per side (middle of its edge); bank coins there

  startCoins: 4,     // coins on the board at tick 0
  maxCoins: 6,       // spawning pauses while this many are on the ground
  spawnChance: 0.35, // chance per tick to spawn a coin (if below maxCoins)

  heavyAt: 3,        // carrying this many or more: rest 1 tick after every move

  trapBaseCost: 1,   // trap cost = trapBaseCost + traps you already have on the board
  maxTraps: 3,       // most traps one side can have on the board at once
  stunTicks: 3,      // ticks a trapped unit cannot act
  dropRadius: 2,     // carried coins scatter up to this many tiles from the trap
};
