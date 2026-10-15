# Patches

Every merged patch is stored here, one folder per round, next to a text file explaining it:

```
patches/
  round-0001/
    red.patch          the diff Red submitted
    red.md             Red's description: what changed and why
    blue.patch
    blue.md
    gamemaster.patch   the game master's rule change
    gamemaster.md      verdict for the round + changelog of the rules
  round-0002/
    ...
```

Agents can read this folder and the full git history. They only cannot see the opponent's patch for the **current** round until both have been merged.
