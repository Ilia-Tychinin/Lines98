# Lines 98 PWA — Development Plan

## Current Status (as of 2026-04-28)

| Phase | Status |
|---|---|
| Phase 1 — Foundation | ✅ Complete |
| Phase 2 — Core Gameplay | ✅ Complete |
| Phase 3 — Polish | ✅ Complete (merged into Phase 2) |
| Phase 4 — Icons & QA | 🔄 In progress |

### Phase 4 remaining tasks
- [ ] Edge case testing on iPhone:
  - [ ] Diagonal line clear — should score and remove correctly
  - [ ] Simultaneous row + diagonal — should score both independently (20pts for two 5-lines)
  - [ ] Undo after a line-clearing move — score must revert, board must revert
  - [ ] Blocked path — tapping unreachable cell should do nothing (silent)
  - [ ] Board near-full spawn → game over triggered correctly
  - [ ] Full scoring table verified: 5→10, 6→12, 7→18, 8→28, 9→42, 10+→60
- [ ] Dynamic Island — confirm top bar sits below the island (safe-area-inset-top)
- [ ] Offline test — install PWA, stop Docker, reopen from home screen icon

---

## Agreed Design Decisions

| Decision | Choice |
|---|---|
| Rendering | CSS Grid + DOM elements |
| Ball style | Glossy CSS `radial-gradient` spheres with white highlight (classic 3D look) |
| Top bar | SCORE (left) — 3 mini glossy balls preview (center) — BEST (right) |
| Safe area | `env(safe-area-inset-top/bottom)` — Dynamic Island + home indicator |
| Scoring | Original Lines 98 table (5→10, 6→12, 7→18, 8→28, 9→42, 10→60) |
| Multiple line clears | Score each line independently, sum the total |
| Animations | Full set — step-by-step path movement (~80ms/step), spawn bounce, clear flash/fade, selected pulse loop |
| Undo | Yes — 1 level deep (board snapshot saved before each move) |
| Sound | No (deferred to future iteration) |
| Icons | Source: `lines-98-icon.png` → resized via `generate-icons.html` (Canvas-based, one-click) |
| Game over | Inline animated overlay — dims board, shows score, high score achieved flag, New Game button |
| Orientation | Portrait only (`"orientation": "portrait"` in manifest) |
| High score | Always visible in top bar, persisted via `localStorage` |
| Pathfinding | BFS, animate step-by-step along found path |

---

## File Structure

```
lines98/
├── index.html            # App shell, grid markup
├── style.css             # Mobile-first styles, CSS variables for colors, animations
├── game.js               # All game logic (board, BFS, scoring, undo, spawn, line detection)
├── manifest.json         # PWA manifest (portrait, standalone, safe-area)
├── service-worker.js     # Cache-first offline strategy
├── generate-icons.html   # One-time tool: loads lines-98-icon.png → downloads 192/512 PNGs
├── icons/
│   ├── icon-192.png      # Generated from lines-98-icon.png
│   └── icon-512.png      # Generated from lines-98-icon.png
└── Dockerfile            # nginx:alpine serving static files on port 8080
```

---

## Phase 1 — Foundation
**Goal:** Game opens on iPhone, installs to home screen, works offline.

### Tasks
1. `Dockerfile` — `nginx:alpine`, copy all static files, expose port 80
2. `manifest.json` — name, icons, `display: standalone`, `orientation: portrait`, theme color
3. `service-worker.js` — cache-first, precache all assets on install
4. `index.html` — app shell with top bar + 9×9 grid cells + safe-area padding
5. `style.css` — CSS variables for 7 ball colors, grid layout, top bar layout, safe-area insets
6. `generate-icons.html` — loads `lines-98-icon.png`, draws to Canvas at 192×192 and 512×512, download buttons

### Milestone
- `docker build -t lines98 . && docker run -d -p 8080:80 lines98`
- Open `http://<pc-ip>:8080` in iPhone Safari
- Tap Share → Add to Home Screen
- App launches full-screen, grid visible, installs offline

---

## Phase 2 — Core Gameplay
**Goal:** Fully playable game (no polish).

### Tasks
1. **Board state** — 9×9 array, ball objects `{ color, id }`, empty = null
2. **Ball rendering** — render board state to DOM cells, glossy CSS sphere per color
3. **Ball selection** — tap empty cell: ignore; tap ball: select (highlight ring), tap again: deselect
4. **BFS pathfinding** — given selected ball position + target cell, find path through empty cells (horizontal/vertical only); return path array or null if blocked
5. **Move execution** — on valid target tap: animate ball step-by-step along path (~80ms/step), update board state
6. **Line detection** — after move completes, scan all rows, columns, diagonals for 5+ consecutive same-color; collect unique cells
7. **Scoring** — apply original scoring table to each cleared line, sum total, update display
8. **Ball spawn** — if no lines cleared: place 3 random balls (from next-balls queue) at random empty cells; generate new next-balls queue
9. **Line detection after spawn** — re-check lines after new balls land
10. **Next-balls preview** — maintain queue of 3 upcoming colors, display in top bar
11. **Game over detection** — after spawn, if board is full (no empty cells), trigger game over

### Milestone
- Game is fully playable end-to-end
- Balls move, lines clear, score updates, new balls spawn, game ends when board fills

---

## Phase 3 — Polish
**Goal:** Complete feature set with all animations and UX.

### Tasks
1. **Spawn animation** — new balls scale from 0→1.15→1 with `cubic-bezier` overshoot
2. **Clear animation** — cleared balls flash bright → fade + shrink over ~300ms; wait for animation before re-rendering
3. **Selected ball pulse** — CSS `@keyframes` scale 1→1.1→1, repeat indefinitely while selected
4. **Undo** — save full board snapshot + score before each move; "Undo" button in top bar restores snapshot (one level only; disabled if no snapshot)
5. **Game over overlay** — animated overlay: board dims, card slides up with "GAME OVER", final score, "NEW HIGH SCORE!" if applicable, New Game button
6. **High score persistence** — read/write `localStorage` key `lines98_best`; update in real-time during play
7. **New Game button** — resets board, score, undo snapshot, next-balls queue; re-renders
8. **Spawn position preview** — after each completed turn, pre-pick the 3 spawn positions and show them as small semi-transparent colored dots on those cells; dots disappear when balls spawn or when a ball is moved onto a preview cell (replaced by a fresh random spot at spawn time)

### Milestone
- All animations play correctly
- Undo works
- Game over overlay appears with correct data
- High score persists across sessions and app restarts

---

## Phase 4 — Icons & Final QA
**Goal:** Ship-ready.

### Tasks
1. **Generate icons** — open `generate-icons.html` in Chrome, download `icon-192.png` and `icon-512.png`, place in `icons/`
2. **iPhone install test** — fresh install from Docker, verify PWA prompt works, verify offline play after stopping Docker
3. **Edge case testing:**
   - Diagonal line clears
   - Simultaneous row + diagonal clear (scoring both independently)
   - Undo after a line-clearing move
   - Board-full detection (no false game-over when empty cells remain)
   - BFS blocked path (ball cannot reach target — no move, no penalty)
   - Spawning balls onto a full board triggers game over
4. **Dynamic Island verification** — confirm top bar sits below safe area on notched iPhones
5. **Rebuild Docker image** with final icons included

### Milestone
- Game installs and plays correctly on real iPhone
- All edge cases pass
- Offline works after Docker is stopped

---

## Scoring Reference Table (Original Lines 98)

| Balls in line | Points |
|---|---|
| 5 | 10 |
| 6 | 12 |
| 7 | 18 |
| 8 | 28 |
| 9 | 42 |
| 10+ | 60 |

Formula approximation: `points = Math.max(10, (n - 4) * (n - 3) * 2)`

---

## 7 Ball Colors

| Name | CSS suggestion |
|---|---|
| Red | `#e03030` |
| Blue | `#2060e0` |
| Green | `#20a020` |
| Yellow | `#e0c020` |
| Magenta | `#c030c0` |
| Cyan | `#20b0d0` |
| Orange | `#ff8833` |

