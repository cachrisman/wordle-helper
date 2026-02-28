# Wordle Helper – Hints Only

A mobile-first, installable **Progressive Web App** that helps you solve Wordle-style puzzles by providing **hints**, not by picking the answer for you.

> "This tool gives hints; it won't pick the answer for you."

---

## Features

- **6×5 guess grid** — tap letters or use a physical/on-screen keyboard. Tap any tile to cycle its state (grey → yellow → green).
- **Hints panel** (default view):
  - Remaining candidate count with change delta after every edit
  - Letter frequency bars (overall and per position)
  - Exploration suggestions — high-value letters to try next
  - Conflict detection with one-tap fixes
- **Candidates panel** (secondary, behind a toggle) — shows filtered word list; defaults to 20 random examples so you're not spoiled
- **Offline support** — works fully offline after first visit; the word list is embedded, no network required
- **Offline indicator** — banner shown when `navigator.onLine` is false
- **State persistence** — constraints and view mode are automatically saved to `localStorage`
- **Undo** — step back through changes with the Undo button
- **Accessibility** — high-contrast colours, 44 px minimum touch targets, ARIA labels, focus rings

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Build | Vite 5 |
| UI | React 18 + TypeScript |
| PWA | vite-plugin-pwa (Workbox) |
| Tests | Vitest |
| Styles | Plain CSS custom properties (no framework) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## iPhone – Add to Home Screen (PWA install)

1. Open Safari on your iPhone.
2. Navigate to the deployed URL.
3. Tap the **Share** button (box with up arrow) at the bottom of the screen.
4. Scroll down in the share sheet and tap **"Add to Home Screen"**.
5. Choose a name (default: **WordleHints**) and tap **Add**.

The app icon will appear on your home screen. When you open it:
- It launches in **standalone mode** (no Safari chrome).
- Status bar adapts to the dark theme.
- Safe-area insets are respected on notched iPhones.

> **Offline behaviour**: after the first visit, all app assets and the word list are cached by the service worker. You can open the app and use it fully without a network connection. An "Offline mode" banner appears at the top when `navigator.onLine` is `false`.

---

## How to Use

| Action | How |
|--------|-----|
| Enter a letter | Tap a cell then type, or use the on-screen keyboard |
| Move cursor | Type (auto-advance) or tap any cell |
| Delete a letter | Backspace key or ⌫ on the on-screen keyboard |
| Set tile state | Tap a filled tile to cycle: grey → yellow → green → grey |
| See hints | Hints panel is shown by default |
| See candidates | Tap **Candidates** in the bottom bar |
| Undo a change | Tap **⎌ Undo** in the bottom bar |
| Reset puzzle | Tap **↺ Reset** in the bottom bar |

### Tile colours

| Colour | Meaning |
|--------|---------|
| **Grey** | Letter is not in the word |
| **Yellow** | Letter is in the word, but wrong position |
| **Green** | Letter is in the correct position |

---

## Project Structure

```
src/
├── assets/
│   └── words.json          # Embedded 5-letter word list
├── components/
│   ├── GuessGrid.tsx        # 6×5 interactive tile grid
│   ├── OnScreenKeyboard.tsx # QWERTY keyboard with state colours
│   ├── HintsPanel.tsx       # Frequency bars, suggestions, conflicts
│   ├── CandidatesPanel.tsx  # Filtered word list (secondary)
│   ├── BottomBar.tsx        # Sticky action bar
│   ├── OfflineIndicator.tsx # Online/offline banner
│   └── OnboardingBanner.tsx # First-launch instructions
├── hooks/
│   ├── useLocalStorage.ts   # Persisted state hook
│   ├── useOnline.ts         # navigator.onLine reactive hook
│   └── useUndoable.ts       # State with undo history
├── lib/
│   ├── types.ts             # Shared TypeScript types
│   ├── constraints.ts       # buildConstraintsFromGrid()
│   ├── filter.ts            # filterWords()
│   └── analyze.ts           # analyzeCandidates(), detectConflicts()
├── tests/
│   └── filter.test.ts       # Vitest unit tests (19 tests)
├── App.tsx                  # Root component + all state
├── main.tsx                 # React entry point
└── index.css                # All styles (CSS custom properties)
```

---

## Core API

### `buildConstraintsFromGrid(grid: GridState): Constraints`

Derives a `Constraints` object from the 6×5 grid. Handles:
- Green: exact position matches
- Yellow: letter present, disallowed positions accumulated across rows
- Grey: letter excluded, unless confirmed elsewhere
- Duplicate logic: `minCount` (≥N confirmed) and `maxCount` (exact when grey+confirmed in same row)

### `filterWords(words: string[], constraints: Constraints): string[]`

Pure function. Filters the word list to candidates satisfying all constraints.

### `analyzeCandidates(candidates: string[]): CandidateAnalysis`

Returns:
- `count` — number of remaining candidates
- `frequency.overall` — letter → fraction of candidates containing it
- `frequency.byPosition` — position → letter → fraction
- `topExplorationLetters` — letters ranked by information-gain potential (closest to 50% split)

### `detectConflicts(constraints: Constraints): Conflict[]`

Identifies contradictions: a letter is green/yellow but also excluded.

---

## Offline / PWA Behaviour

The service worker (generated by vite-plugin-pwa using Workbox) precaches:
- All JS/CSS/HTML bundles
- `words.json`
- PWA icons

On subsequent visits the app shell loads instantly from cache. Network is only used to check for updates in the background.

---

## Changelog

### v1.1.0 — 2026-02-28
- Initial PWA release
- 6×5 Wordle-style guess grid with tap-to-cycle tile states
- On-screen QWERTY keyboard with key state colouring
- Hints panel: candidate count with delta, letter frequency bars, per-position frequency, exploration suggestions
- Candidates panel (secondary) with random-sample option
- Full constraint model: greens, yellows (per-position), greys, minCount/maxCount for duplicate handling
- Conflict detection and one-tap fix
- Offline support via service worker + embedded word list
- State persistence via localStorage
- Undo history (up to 50 steps)
- Physical keyboard support
- iPhone safe-area insets + Add to Home Screen support
- 19 Vitest unit tests covering filter logic and duplicate edge cases
- Onboarding banner for first-time users

### v1.0.0
- Initial stub (`README.md` only)
