# best-heist-game-01

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/vinnvv/best-heist-game-01/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/vinnvv/best-heist-game-01/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

GILDED WIRE is a 1960s Mid-Century architectural heist game. You are a professional thief
inside a private auction pavilion at midnight. Cross three connected galleries, slip past
patrolling guards whose amber vision cones are cut by walls and pillars with real raycasting,
dodge a sweeping CCTV camera, steal the Amber Crown from the glass atrium, and escape to the
emerald extraction lift before the alarm meter hits 100% and the pavilion locks down.

## How to play

- WASD or arrow keys: move (165 px/s). Hold Shift to sneak (95 px/s, harder to spot).
- Left mouse click: throw an EMP jammer or coin distraction (2 per level). Near a camera it
  cuts the feed for 6 seconds; near a guard it lures the guard to the spot.
- E: grab the crown (or stand beside it for 0.5 s), and hack the camera panel in the security
  corridor to cut the camera feed for 8 seconds.
- P: pause. M: mute. R: instant restart.
- Guards go from patrol to suspicious to chase as they spot you. The camera raises the alarm
  fast and calls the nearest guard. When you are hidden the alarm falls 15% a second.

Win ranks: GHOST (never really seen), MASTERMIND (low peak alarm, fast escape), or
CLEAN GETAWAY.

## How to run

Requires Node.js 22 or later. No build step, no network requests, no libraries.

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Layout

- `main.ts` hands the entry in: it copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json`.
- `game/` is the playable game as static files: `index.html` plus ES modules under
  `game/src/` (config, raycast, world, guards, cameras, alarm, render, input, audio,
  shots, main).
- `screenshots/` holds four real renders of the game's own code.
- `vendor/makefun-game.ts` is the make.fun library, copied from the kit unchanged.
