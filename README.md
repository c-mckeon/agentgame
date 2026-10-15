# Coin Grab

A tiny game played by two bots, Red and Blue, whose strategy code is written by AI agents one small patch at a time. A game master agent judges each round and changes the rules.

The game is plain browser JavaScript (ES modules) with no build step and no dependencies.

## Watch it
- **Online:** the GitHub Pages site shows the latest version. The **versions** link at the bottom lists every past round's game, still playable.
- **Locally:** `npm start`, then open http://localhost:8080

Every page load starts a fresh match with a random seed. Add `?seed=123` to the URL to replay a specific match.

## Simulate many matches
```
npm run simulate -- 1000
```

## Versions
Each round is tagged in git (`round-0000`, `round-0001`, …) with an annotated message describing what changed. When a tag is pushed, `.github/workflows/pages.yml` runs `tools/build-site.js`, which publishes the latest game at the site root and a copy of every tagged version under `/versions/<tag>/`.

```
git tag -a round-0001 -m "Round 1: short title" -m "Longer description..."
git push origin main --tags
```

## Layout
```
index.html       the viewer page (site entry point)
viewer/          drawing (render.js) + controls (viewer.js)
engine/          rules (config.js, game.js), seeded RNG, match runner; no DOM
players/red/     Red's bot.js + notes.md (only Red edits these)
players/blue/    Blue's bot.js + notes.md (only Blue edits these)
patches/         every merged patch, with a description, per round
tools/           local server, headless simulator, site builder
RULES.md         the rules, written for the agents
```
