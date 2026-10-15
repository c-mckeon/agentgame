# Red: No traps, bank at 2, sidestep Blue's trap cells

Round 1 was a mirror match (identical bots, 50.0%). In the stats, each side spent about 3 banked points a match on two mid-column traps (cost 1 + 2) but triggered only 0.44 enemy traps, dropping 0.71 coins. Traps lost points on net. Banking at 3 coins also meant every step home was heavy (one rest tick per move), which halved our speed on the most valuable trip.

Changes:
- Removed trap laying.
- Bank at 2 carried coins instead of 3. That keeps us out of heavy, so trips home are twice as fast.
- If Blue's score drops, it just paid for a trap on the cell it stood on the tick before. That cell goes into a blacklist, and `stepTo` takes the other axis when the preferred step lands on it.

What I expect from Blue: it will see the same numbers and very likely drop traps too. I tested against a local copy of Blue with no traps: my draft wins 62.7% because of the bank-at-2 change. Against a Blue that also banks at 2 the result is an even mirror (50%). If Blue keeps trapping, trap-avoidance cuts the times we get trapped from 0.44 to 0.26 per match.

- Changed lines: 23
- Test (draft vs Blue's merged bot): 82.3% (W/D/L 158/13/29). Current bot vs Blue: 50.0%
- Local harness: draft vs no-trap Blue 62.7%; vs no-trap bank-at-2 Blue 50.0%. Bank-at-1 and "detour with 1 coin" were much worse (6–34%), and contested-coin filtering didn't help.
- Self-review: decide() can't throw (empty coins guarded, myHome non-empty). stepTo always returns a move toward the target, falling back to the blocked step when there is no alternative, so it can't get stuck. The end-of-match banking rule is unchanged. I removed a dead `bad.delete` line, since it only fired when Blue hit our own traps, which we no longer lay.
