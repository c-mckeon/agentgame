// Runs bots against the engine. Shared by the browser viewer and tools/simulate.js.

import { SIDES, buildView, toBoardAction, step, createGame, isOver, winner } from "./game.js";

/** Ask one bot for its move. A crash or invalid answer counts as STAY. */
export function askBot(bot, game, side) {
  try {
    return toBoardAction(side, bot.decide(buildView(game, side)));
  } catch (err) {
    console.warn(`${side} bot crashed on tick ${game.tick}:`, err);
    return "STAY";
  }
}

/** Play one tick: both bots decide on the same view of the board, then the engine steps. */
export function playTick(game, bots) {
  const actions = {};
  for (const side of SIDES) actions[side] = askBot(bots[side], game, side);
  return step(game, actions);
}

/** Play a whole match without drawing anything. */
export function runMatch(createRed, createBlue, seed) {
  const game = createGame(seed);
  const bots = { red: createRed(), blue: createBlue() };
  while (!isOver(game)) playTick(game, bots);
  return { seed, red: game.units.red.score, blue: game.units.blue.score, winner: winner(game) };
}
