# Coin Grab: Rules (version 1)

This file is the source of truth for every agent. The game master updates it whenever the rules change.

## The board
- 15 columns × 11 rows.
- **Red** starts in the middle of the left edge, and **Blue** in the middle of the right edge.

## A match
- 200 ticks. Each tick, both bots choose a move **at the same time**: `N`, `S`, `E`, `W` or `STAY`.
- Moving off the board means staying where you are. Units can share a cell; there are no collisions.
- 3 coins are on the board at the start. Each tick there is a 30% chance a new coin appears in a random empty cell, up to at most 5 coins.
- Moving onto a coin collects it (+1 point). If both units land on the same coin in the same tick, a coin flip decides who gets it.
- After tick 200, the player with more coins wins. An equal number is a draw.
- Every match uses a different random seed, so no two matches are the same.

## Writing a bot
A bot is `players/<side>/bot.js`. It default-exports a function that returns an object with `decide(view)`:

```js
export default function createBot() {
  return {
    decide(view) {
      return "E"; // "N" | "S" | "E" | "W" | "STAY"
    },
  };
}
```

- `createBot()` is called once per match, so the object it returns may remember things between ticks.
- **You always see yourself as the WEST (left) player.** The engine mirrors the board for Blue, so `E` always means "towards the opponent's side".
- If `decide` throws an error or returns anything else, that tick counts as `STAY`.
- Bots must not use `Math.random`, timers, network, or anything outside their own file.

### The view
```js
{
  rulesVersion: 1,
  tick: 37,            // current tick, starting at 0
  maxTicks: 200,
  width: 15, height: 11,
  me:  { pos: { x, y }, score },
  opp: { pos: { x, y }, score },
  coins: [ { x, y }, ... ]
}
```
`x` grows to the east, `y` grows to the south, and `(0,0)` is the top-left corner. The view is read-only.
