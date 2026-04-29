(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────
  const COLORS      = ['red', 'blue', 'green', 'yellow', 'magenta', 'cyan', 'orange'];
  const SPAWN       = 3;
  const MIN_LINE    = 5;
  const STEP_MS     = 80;
  const SCORES      = { 5: 10, 6: 12, 7: 18, 8: 28, 9: 42 };
  const STORAGE_KEY = 'lines98_best';
  const SAVE_KEY    = 'lines98_save';

  // ── State ──────────────────────────────────────────────────────
  let board;       // Array(81): null | { color: string }
  let selected;    // number | null — index of selected ball
  let score;
  let nextColors;  // string[3] — upcoming spawn colors
  let nextSpots;   // number[3] — pre-picked spawn positions shown as dots
  let undo;        // snapshot | null
  let busy;        // true while animating — blocks input
  let newBest;     // true if current game beat the high score

  let best = +(localStorage.getItem(STORAGE_KEY) || 0);

  // ── DOM refs ───────────────────────────────────────────────────
  const $board   = document.getElementById('board');
  const $score   = document.getElementById('score');
  const $best    = document.getElementById('best');
  const $next    = [...document.querySelectorAll('.next-ball')];
  const $undo    = document.getElementById('btn-undo');
  const $newGame = document.getElementById('btn-new-game');
  const $overlay      = document.getElementById('overlay');
  const $ovScore      = document.getElementById('overlay-score');
  const $ovHi         = document.getElementById('overlay-hiscore');
  const $ovPlay       = document.getElementById('overlay-new-game');
  const $build        = document.getElementById('build');
  const $updateBanner = document.getElementById('update-banner');

  let cells = []; // 81 cell DOM elements

  // ── Utilities ──────────────────────────────────────────────────
  const sleep  = ms => new Promise(r => setTimeout(r, ms));
  const rnd    = n  => Math.floor(Math.random() * n);
  const rndClr = () => COLORS[rnd(COLORS.length)];
  const mkClrs = () => Array.from({ length: SPAWN }, rndClr);

  function pickN(arr, n) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  function empties() {
    const out = [];
    board.forEach((v, i) => { if (!v) out.push(i); });
    return out;
  }

  function lineScore(n) { return SCORES[n] ?? 60; }

  // ── BFS ────────────────────────────────────────────────────────
  function nbrs(pos) {
    const r = (pos / 9) | 0, c = pos % 9, out = [];
    if (r > 0) out.push(pos - 9);
    if (r < 8) out.push(pos + 9);
    if (c > 0) out.push(pos - 1);
    if (c < 8) out.push(pos + 1);
    return out;
  }

  function findPath(from, to) {
    if (board[to]) return null;
    const vis = new Uint8Array(81);
    vis[from] = 1;
    const q = [[from]];
    while (q.length) {
      const path = q.shift();
      for (const nb of nbrs(path[path.length - 1])) {
        if (nb === to) return [...path, nb];
        if (!vis[nb] && !board[nb]) { vis[nb] = 1; q.push([...path, nb]); }
      }
    }
    return null;
  }

  // ── Line detection ─────────────────────────────────────────────
  function scan(start, step, len, out) {
    let color = null, run = [];
    for (let i = 0; i < len; i++) {
      const idx = start + i * step;
      const c   = board[idx]?.color ?? null;
      if (c && c === color) {
        run.push(idx);
      } else {
        if (run.length >= MIN_LINE) out.push([...run]);
        run = c ? [idx] : [];
        color = c;
      }
    }
    if (run.length >= MIN_LINE) out.push([...run]);
  }

  function findLines() {
    const L = [];
    for (let i = 0; i < 9; i++) scan(i * 9, 1,  9,       L);  // rows
    for (let i = 0; i < 9; i++) scan(i,     9,  9,       L);  // cols
    for (let c = 0; c <= 4; c++) scan(c,       10, 9 - c, L);  // ↘ from top row
    for (let r = 1; r <= 4; r++) scan(r * 9,   10, 9 - r, L);  // ↘ from left col
    for (let c = 4; c <= 8; c++) scan(c,        8, c + 1, L);  // ↙ from top row
    for (let r = 1; r <= 4; r++) scan(r*9 + 8,  8, 9 - r, L);  // ↙ from right col
    return L;
  }

  // ── Spawn preview ──────────────────────────────────────────────
  function pickSpots() {
    const e = empties();
    nextSpots = pickN(e, Math.min(SPAWN, e.length));
  }

  function renderSpots() {
    hideSpots();
    nextSpots.forEach((pos, i) => {
      if (board[pos]) return;
      const dot = document.createElement('div');
      dot.className = 'preview-dot';
      dot.dataset.color = nextColors[i];
      cells[pos].appendChild(dot);
    });
  }

  function hideSpots() {
    cells.forEach(cell => cell.querySelector('.preview-dot')?.remove());
  }

  // ── Rendering ──────────────────────────────────────────────────
  function renderCell(i, spawn = false) {
    const cell = cells[i];
    let   ball = cell.querySelector('.ball');
    if (!board[i]) {
      ball?.remove();
      cell.classList.remove('selected');
      return;
    }
    if (!ball) {
      ball = document.createElement('div');
      ball.className = 'ball';
      cell.appendChild(ball);
    }
    ball.dataset.color = board[i].color;
    if (spawn) {
      ball.classList.remove('spawning');
      void ball.offsetWidth; // force reflow to restart animation
      ball.classList.add('spawning');
    }
    cell.classList.toggle('selected', selected === i);
  }

  function renderAll() { hideSpots(); for (let i = 0; i < 81; i++) renderCell(i); }

  function showScore() { $score.textContent = score; $best.textContent = best; }
  function showNext()  { $next.forEach((el, i) => { el.dataset.color = nextColors[i]; }); }

  // ── Animations ─────────────────────────────────────────────────
  async function animateMove(path, color) {
    for (let i = 1; i < path.length; i++) {
      board[path[i - 1]] = null;
      board[path[i]]     = { color };
      renderCell(path[i - 1]);
      renderCell(path[i]);
      await sleep(STEP_MS);
    }
  }

  async function animateClear(idxs) {
    idxs.forEach(i => cells[i].querySelector('.ball')?.classList.add('clearing'));
    await sleep(400);
    idxs.forEach(i => { board[i] = null; renderCell(i); });
  }

  // ── Undo ───────────────────────────────────────────────────────
  function saveUndo() {
    undo = { board: board.map(v => v ? { ...v } : null), score, next: [...nextColors], spots: [...nextSpots] };
    $undo.disabled = false;
  }

  function doUndo() {
    if (!undo || busy) return;
    board = undo.board; score = undo.score; nextColors = undo.next; nextSpots = undo.spots;
    undo = null; selected = null;
    $undo.disabled = true;
    showScore(); showNext(); renderAll(); renderSpots();
    saveState();
  }

  // ── Scoring ────────────────────────────────────────────────────
  function addScore(lines) {
    score += lines.reduce((s, l) => s + lineScore(l.length), 0);
    if (score > best) {
      best = score; newBest = true;
      localStorage.setItem(STORAGE_KEY, best);
    }
    showScore();
  }

  // ── Spawn ──────────────────────────────────────────────────────
  async function doSpawn() {
    const free    = empties();
    const exclude = new Set(nextSpots);
    const pool    = pickN(free.filter(pos => !exclude.has(pos)),
                          nextSpots.filter(pos => board[pos]).length);
    let pi = 0;
    const pairs   = nextSpots.map((pos, i) => [board[pos] ? pool[pi++] : pos, nextColors[i]])
                             .filter(([pos]) => pos !== undefined);

    hideSpots();
    pairs.forEach(([pos, color]) => { board[pos] = { color }; renderCell(pos, true); });
    await sleep(350);

    nextColors = mkClrs();
    showNext();

    const lines = findLines();
    if (lines.length) {
      addScore(lines);
      await animateClear([...new Set(lines.flat())]);
    }

    if (!empties().length) { endGame(); return; } // board state changed since free was computed above

    pickSpots();
    renderSpots();
  }

  // ── Persistence ────────────────────────────────────────────────
  const serBoard   = arr => arr.map(v => v ? v.color : null);
  const deserBoard = arr => arr.map(c => c ? { color: c } : null);

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1,
      board: serBoard(board),
      score,
      nextColors,
      nextSpots,
      undo: undo ? { board: serBoard(undo.board), score: undo.score, next: undo.next, spots: undo.spots } : null
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.v !== 1) return null;
      return s;
    } catch { return null; }
  }

  function resumeOrNew() {
    const s = loadState();
    if (!s) { newGame(); return; }
    board      = deserBoard(s.board);
    score      = s.score;
    nextColors = s.nextColors;
    nextSpots  = s.nextSpots;
    undo       = s.undo ? { board: deserBoard(s.undo.board), score: s.undo.score, next: s.undo.next, spots: s.undo.spots } : null;
    selected = null; busy = false; newBest = false;
    $undo.disabled = !undo;
    $overlay.classList.add('hidden');
    showScore(); showNext(); renderAll(); renderSpots();
  }

  // ── Game over ──────────────────────────────────────────────────
  function endGame() {
    localStorage.removeItem(SAVE_KEY);
    $ovScore.textContent = score;
    $ovHi.classList.toggle('hidden', !newBest);
    $overlay.classList.remove('hidden');
  }

  // ── Tap handler ────────────────────────────────────────────────
  async function handleTap(i) {
    if (busy) return;

    if (selected === null) {
      if (board[i]) { selected = i; renderCell(i); }
      return;
    }

    if (i === selected) { selected = null; renderCell(i); return; }

    if (board[i]) {
      const prev = selected; selected = i;
      renderCell(prev); renderCell(i);
      return;
    }

    const path = findPath(selected, i);
    if (!path) return;

    const from = selected, color = board[from].color;
    selected = null;
    renderCell(from);

    busy = true;
    saveUndo();
    try {
      await animateMove(path, color);
      const lines = findLines();
      if (lines.length) {
        addScore(lines);
        await animateClear([...new Set(lines.flat())]);
      } else {
        await doSpawn();
      }
      if ($overlay.classList.contains('hidden')) saveState();
    } finally {
      busy = false;
    }
  }

  // ── New game ───────────────────────────────────────────────────
  function newGame() {
    localStorage.removeItem(SAVE_KEY);
    board = new Array(81).fill(null);
    score = 0; selected = null; undo = null; busy = false; newBest = false;
    $undo.disabled = true;
    $overlay.classList.add('hidden');

    const initPos = pickN(Array.from({ length: 81 }, (_, i) => i), 5);
    initPos.forEach(pos => { board[pos] = { color: rndClr() }; });

    nextColors = mkClrs();
    showScore();
    showNext();
    renderAll();
    pickSpots();
    renderSpots();
    saveState();
  }

  // ── Bootstrap ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    for (let i = 0; i < 81; i++) {
      const el = document.createElement('div');
      el.className = 'cell';
      el.addEventListener('click', () => handleTap(i));
      $board.appendChild(el);
      cells.push(el);
    }

    $undo.addEventListener('click', doUndo);
    $newGame.addEventListener('click', newGame);
    $ovPlay.addEventListener('click', newGame);
    $updateBanner.addEventListener('click', () => window.location.reload());

    resumeOrNew();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').then(reg => {
        caches.keys().then(keys => {
          const v = keys.find(k => k.startsWith('lines98-'));
          if (v) $build.textContent = v;
        });
        const hadController = !!navigator.serviceWorker.controller;
        reg.update().catch(() => {});
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (hadController) $updateBanner.classList.remove('hidden');
        });
      }).catch(console.error);
    }
  });
}());
