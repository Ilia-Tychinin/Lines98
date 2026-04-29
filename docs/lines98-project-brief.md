# Lines 98 — PWA Game Project Brief

## Purpose of This Document

This document captures the full context of a conversation about building the classic **Lines 98** game as a Progressive Web App (PWA) for iPhone. It is intended to be used as a prompt/context file when continuing development in **Claude Cowork mode from VS Code**.

---

## Project Goal

Build a fully functional **Lines 98** clone as a **PWA** that can be installed on an iPhone home screen and played offline — with zero cost, no backend, and developed entirely on a Windows machine.

---

## Game Description — Lines 98

Lines 98 (also known as Color Lines) is a classic logic/puzzle game from the 1990s:

- **Board**: 9×9 grid
- **Balls**: Colored balls (7 colors) appear on the grid
- **Each turn**: The player moves one ball to a new cell. The ball can only move if there is a clear path (no obstacles blocking the route). After each move, 3 new random balls appear on the board.
- **Scoring**: When 5 or more balls of the same color form a horizontal, vertical, or diagonal line, they are removed and the player scores points. When balls are cleared, no new balls appear that turn.
- **Game over**: The board is completely filled with no moves possible.
- **Pathfinding**: The game requires BFS or A* pathfinding to determine if a ball can reach a target cell.

---

## Constraints (Firm Requirements)

| Constraint | Detail |
|---|---|
| **Development machine** | Windows (user has Docker Desktop installed) |
| **No Mac / Xcode** | Cannot use native iOS development toolchain |
| **No money** | Zero budget — no Apple Developer account ($99), no paid services |
| **No backend** | The game must be fully self-contained on the phone after install |
| **Deployment** | Local via Docker (preferred by user), NOT GitHub Pages |

---

## Agreed Architecture

### Technology

- **Pure HTML + CSS + JavaScript** — no frameworks needed for a game this simple
- **PWA** with:
  - `manifest.json` (for "Add to Home Screen" capability)
  - `service-worker.js` (for offline caching of all assets)
- **Touch-friendly UI** designed for iPhone screen
- **Canvas-based or CSS Grid-based** rendering (to be decided during implementation)

### Local Deployment via Docker

The user already has **Docker Desktop** on Windows. The deployment approach:

1. A minimal `Dockerfile` using `nginx:alpine` to serve static files
2. Build: `docker build -t lines98 .`
3. Run: `docker run -d -p 8080:80 lines98`
4. User opens `http://<pc-local-ip>:8080` on iPhone Safari (same Wi-Fi)
5. User taps Share → "Add to Home Screen"
6. Service worker caches all files locally on the iPhone
7. Docker container can be stopped — the game persists on the phone offline

### PWA Install Flow (for iPhone)

1. Open the game URL in **Safari** (must be Safari — Chrome on iOS doesn't support PWA install)
2. Tap the **Share button** (square with arrow)
3. Tap **"Add to Home Screen"**
4. The app appears as a standalone icon, launches full-screen, works offline

---

## What Needs to Be Built

### Core Game Files

```
lines98/
├── index.html          # Main HTML file
├── style.css           # Styles (mobile-first, touch-friendly)
├── game.js             # Game logic (board, balls, scoring, pathfinding)
├── manifest.json       # PWA manifest
├── service-worker.js   # Offline caching
├── icons/              # App icons (multiple sizes for iOS)
│   ├── icon-192.png
│   └── icon-512.png
└── Dockerfile          # nginx:alpine serving static files
```

### Game Features to Implement

1. **9×9 grid** rendering (responsive, fits iPhone screen)
2. **7 ball colors** with visually distinct, polished appearance
3. **Ball selection** — tap to select, tap destination to move
4. **Pathfinding (BFS)** — validate move, animate ball along path
5. **Line detection** — check horizontal, vertical, diagonal lines of 5+
6. **Scoring system** — display current score, track high score (localStorage)
7. **Next balls preview** — show the 3 upcoming ball colors
8. **Ball spawn** — 3 random balls after each move (unless a line was cleared)
9. **Game over detection** — board full, no valid moves
10. **New game / restart** button
11. **Animations** — ball movement along path, ball appearance, line clear effect
12. **Touch-optimized** — large tap targets, no hover states, responsive layout
13. **PWA** — manifest, service worker, offline support, home screen icon
14. **Dockerfile** — ready to build and run locally

### Nice-to-Have Features

- Undo last move
- Sound effects (tap, move, clear, game over)
- High score persistence across sessions (localStorage)
- Ball bounce/pulse animation when selected

---

## Technical Notes

- **Pathfinding**: Use BFS (Breadth-First Search) — simpler than A* and sufficient for a 9×9 grid. Check if a clear path exists from selected ball to target cell (only horizontal/vertical movement through empty cells).
- **Line checking**: After each move AND after spawning new balls, check all rows, columns, and diagonals for 5+ consecutive same-color balls.
- **Service worker**: Cache-first strategy — cache all assets on install, serve from cache, fall back to network.
- **No localStorage in artifacts** — but this is for a standalone PWA served from Docker, so localStorage is fine for high score persistence.
- **Safari PWA quirks**: Safari has limited PWA support compared to Chrome. The `display: standalone` in manifest works. No push notifications (not needed). Service worker support is solid in modern iOS Safari.

---

## Next Step

**Build the complete Lines 98 PWA game** with all files listed above, ready to deploy via Docker on the user's Windows machine and install on their iPhone.
