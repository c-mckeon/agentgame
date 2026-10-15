# Coin Grab: Rules (version 2)

This file is the source of truth for every agent. The game master updates it whenever the rules change. All numbers below come from `engine/config.js`.

## The board
- 15 columns × 11 rows. **Red's home** is the 3 middle tiles of the left edge; **Blue's home** is the 3 middle tiles of the right edge.
- Each unit starts on the middle home tile of its side.

## A match
- 240 ticks. Each tick, both bots choose an action **at the same time**: `N`, `S`, `E`, `W`, `STAY` or `TRAP`.
- Moving off the board means staying where you are. Units can share a cell; there are no collisions.

### Coins: greed has a cost
- 4 coins at the start. Each tick there's a 35% chance a new coin appears in a random empty cell (never on a home tile), until 6 are on the ground.
- Stepping onto a coin **picks it up**: you are now *carrying* it. If both units land on the same coin in the same tick, a coin flip decides.
- Carried coins only score once you **bank** them by standing on one of **your own home tiles**. All carried coins bank at once.
- **Heavy:** while carrying **3 or more** coins, every move is followed by 1 tick of rest. You can't move on that tick, but you can still place a trap.
- Coins still being carried when the match ends are **lost**.

### Traps
- `TRAP` places a trap on the cell you're standing on. You don't move that tick.
- **Cost**, paid from your *banked* score: `1 + (number of your traps already on the board)`, so 1, then 2, then 3. You can't have more than 3 traps on the board at once.
- Traps can't be placed on home tiles or on a cell that already has a trap. If you can't afford it or it isn't allowed, nothing happens.
- **Your opponent cannot see your traps**, and you cannot see theirs. Viewers watching the match can see all of them.
- When a unit **moves onto** an enemy trap:
  - it is **stunned for 3 ticks** (it can't act);
  - everything it is carrying **scatters** onto free cells within 2 tiles, where anyone can pick it up;
  - the trap is used up.
- Your own traps never affect you.

### Winning
- After tick 240, the side with more **banked** coins wins. An equal score is a draw.
- Every match uses a different random seed, so no two matches are the same.

## Writing a bot
A bot is `players/<side>/bot.js`. It default-exports a function that returns an object with `decide(view)`:

```js
export default function createBot() {
  return {
    decide(view) {
      return "E"; // "N" | "S" | "E" | "W" | "STAY" | "TRAP"
    },
  };
}
```

- `createBot()` is called once per match, so the object it returns may remember things between ticks, such as where the opponent has been or where its own traps were set off.
- **You always see yourself as the WEST (left) player.** The engine mirrors the board for Blue, so `E` always means "towards the opponent's side".
- `decide` is still called while you are stunned or resting; your action is just ignored. If it throws an error or returns anything invalid, that tick counts as `STAY`.
- Bots must not use `Math.random`, timers, network, or anything outside their own file.

### The view
```js
{
  rulesVersion: 2,
  tick: 37, maxTicks: 240,         // tick starts at 0
  width: 15, height: 11,
  rules: { heavyAt: 3, maxTraps: 3, stunTicks: 3 },
  me:  { pos: {x, y}, score, carry, stunned, resting },  // stunned/resting = ticks left
  opp: { pos: {x, y}, score, carry, stunned },
  myHome:  [ {x, y}, ... ],         // bank here
  oppHome: [ {x, y}, ... ],
  coins:   [ {x, y}, ... ],         // coins on the ground
  myTraps: [ {x, y}, ... ],         // your own traps (enemy traps are hidden)
  trapCost: 1                       // what your next TRAP costs
}
```
`x` grows to the east, `y` grows to the south, and `(0,0)` is the top-left corner. The view is read-only.

**Hint:** an enemy trap is invisible, but its effects aren't. If the opponent suddenly goes stunned, it just stepped on one of your traps. If its score drops by the trap cost, it just laid one.
