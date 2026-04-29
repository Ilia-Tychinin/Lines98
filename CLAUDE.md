# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**When updating this file:** describe principles and behavioral rules — not function names, variable names, or implementation details. Those belong in code comments or commit messages.

## What this is
A classic Lines 98 puzzle game built as a PWA for iPhone. Pure HTML/CSS/JS, served via nginx in Docker over HTTPS. No frameworks, no build tools, no backend. `src/` is the nginx root — everything in it is served directly.

## Deployment
- `setup.ps1` is the only deploy command — it stamps the cache version, builds, and starts everything. Never build manually or the cache stamp won't happen.
- Access via `https://<hostname>.local` — a stable origin that survives IP changes and keeps saved scores intact.

## Game invariants
- A turn is never half-finished — input is blocked until the board fully settles, and cleanup always runs even if something throws.
- The board state is always the source of truth — UI is derived from it, never queried.
- Clearing lines on a move skips spawn; spawn only follows a non-scoring move.
- After spawn, lines are checked again — spawned balls can score immediately.
- Game state is saved after every settled turn so the player can always close and resume without a prompt.
- Spawn preserves the color assigned to each preview slot — if a slot is occupied when spawn runs, only its position changes, not its color.

## Offline
- Everything works offline after the first Safari visit while Docker is running.
- The SW cache is all-or-nothing — a partial install is never accepted; if any core file is missing the SW won't activate.
- After a rebuild, the home screen app detects the update automatically on open and shows a banner prompting the user to reload. No need to open Safari.

## iOS constraints (hard-won)

| Rule | Why |
|---|---|
| HTTPS required | HTTP silently disables service workers — the game won't cache or work offline |
| Use `https://<hostname>.local`, not the IP | Hostname origin survives IP changes — scores and saves are preserved |
| Delete `ssl/` when IP or machine changes | The cert has both baked in — a mismatch causes an SSL error on iPhone |
| Reinstall cert after regenerating | Old cert on device won't trust the new one |
| Open in Safari for first install only | The PWA must be added to the home screen from Safari; subsequent updates are detected automatically by the installed app |
| Two steps to trust the cert | Install the profile AND enable it in Certificate Trust Settings — skipping step 2 causes a white screen |
| Bump icon query string when replacing icons | iOS caches the touch icon separately from everything else |

## Game logic reference
Scoring: 5 in a row → 10 pts, 6 → 12, 7 → 18, 8 → 28, 9 → 42, 10+ → 60. Each line scored independently. 7 ball colors. Lines clear in all 8 directions.

## What's deferred
- Sound effects (Web Audio API) — skip for v1, add later
- Shake animation when path is blocked — currently silent
- Score popup (+N floating text) — not implemented
