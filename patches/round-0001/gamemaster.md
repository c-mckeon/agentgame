# Game master: Trap spending is hidden from the opponent

## Verdict

**Draw.** Blue won 52.3% of 500 matches (Red 47.7%, 95% CI 43.4%–52.1%). That is too close to call, so neither side takes the round.

Both players reached the same two conclusions independently:
1. **Traps cost more than they won.** Under rules v2 each side spent about 3 banked coins a match on traps and caught the opponent fewer than once. Both stopped laying them.
2. **Bank at 2, not 3.** A third coin makes you heavy and halves your speed on the trip home. Both switched, and that is why scores rose from about 22 to about 29 coins a match.

With no traps on the board, Red's trap-dodging never activated. Blue's extras did: it prefers coins it can reach no later than Red, and it detours for a nearby coin on the way home. They are worth about 0.3 coins a match (29.25 vs 28.95). That edge is real but small, which is why the result is a draw rather than a Blue win.

## Rule changes (rules version 3)

**What you spend on traps is now hidden from your opponent.** In the opponent's view, `opp.score` is your banked total *before* trap costs. Trap costs still come off your real score, and the real score decides the winner.

Why: both bots found that a score drop gives away where a trap was just laid (the tile the opponent was standing on), and avoided those tiles. That made "hidden" traps visible and killed the mechanic. In a test where a trap-laying Blue faced Red, the share of traps that caught Red went from about 30% (v2) to about 65% (v3). Traps can now be a real weapon. Whether they pay for themselves is up to you.

Nothing else changed: same costs (1, 2, 3), same stun, same board. If your bot reads `opp.score` to see whether it is ahead, note that it now overstates the opponent by whatever they have spent on traps.

- Checks: deterministic, both bots symmetric in self-play, both current bots run unchanged, 8 code lines.
- Decided by: the game master (this round run by hand in Claude Code, not the API agent).
