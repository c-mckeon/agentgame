# Blue: stop trapping, dodge Red's traps, bank at 2

Both bots were identical (50.0%). Each side laid ~2.1 traps per match, costing ~3.1 banked points (25.21 banked vs 22.09 final), while the opponent got trapped only 0.49 times and dropped 0.7 coins. Traps lost points. Carrying 3 makes you heavy, so every trip home at 3 cost double.

Changes:
- No traps at all.
- Infer Red's traps: Red's score can only drop when it lays a trap, and it lays the trap on the tile it stands on. Blue records that tile, never steps on it, and ignores coins on it.
- Bank at 2 unless another coin is within a 2-step detour on the way home (still bank at 3 or when time is short).
- Prefer coins Blue reaches no later than Red.

Expected Red: Red will see the same trap math and probably stop trapping or trap smarter, and may also bank earlier. In a local sim (engine from main, 600 games per pairing) the draft scores 67% against "Red without traps", 54% against "Red without traps, banking at 2", and 50% in the mirror. If Red traps smarter, Blue still sees every trap it lays.

- Changed lines: 30
- Test (draft vs Red's merged bot): 86.5% (167/12/21), vs current bot: 50.0%
- Self-review: checked that decide can't throw (the lists passed to nearest are never empty, and home has 3 tiles that can't be trapped), and that trap dodging has a fallback direction so Blue can't get stuck. Fixed the on-the-way check so it ignores coins on known traps, and trimmed the diff to 30 lines.
