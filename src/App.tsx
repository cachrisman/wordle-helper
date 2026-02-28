import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GuessGrid } from './components/GuessGrid';
import { OnScreenKeyboard } from './components/OnScreenKeyboard';
import { HintsPanel } from './components/HintsPanel';
import { CandidatesPanel } from './components/CandidatesPanel';
import { BottomBar } from './components/BottomBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnboardingBanner } from './components/OnboardingBanner';
import { buildConstraintsFromGrid, createEmptyGrid } from './lib/constraints';
import { filterWords } from './lib/filter';
import { analyzeCandidates, detectConflicts } from './lib/analyze';
import type { GridState, TileState, Conflict } from './lib/types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOnline } from './hooks/useOnline';
import { useUndoable } from './hooks/useUndoable';
import wordList from './assets/words.json';

const WORDS: string[] = wordList as string[];
const WORD_LENGTH = 5;
const MAX_ROWS = 6;

const STATE_CYCLE: Record<TileState, TileState> = {
  empty: 'grey',
  unknown: 'grey',
  grey: 'yellow',
  yellow: 'green',
  green: 'grey',
};

function cloneGrid(grid: GridState): GridState {
  return grid.map(row => row.map(tile => ({ ...tile })));
}

export default function App() {
  const isOnline = useOnline();
  const [showOnboarding, setShowOnboarding] = useLocalStorage('wh-onboarding', true);
  const [view, setView] = useLocalStorage<'hints' | 'candidates'>('wh-view', 'hints');

  // Grid state with undo support
  const gridUndo = useUndoable<GridState>(createEmptyGrid());
  const grid = gridUndo.current;

  // Active cursor position
  const [activeRow, setActiveRow] = useState(0);
  const [activeCol, setActiveCol] = useState(0);

  // Previous candidate count for delta display
  const prevCountRef = useRef<number | null>(null);
  const [prevCount, setPrevCount] = useState<number | null>(null);

  // Persist grid to localStorage separately (useUndoable doesn't persist)
  const [savedGrid, setSavedGrid] = useLocalStorage<GridState>('wh-grid', createEmptyGrid());
  const [savedRow, setSavedRow] = useLocalStorage<number>('wh-active-row', 0);
  const [savedCol, setSavedCol] = useLocalStorage<number>('wh-active-col', 0);

  // Restore persisted state on mount
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (savedGrid && savedGrid.length === MAX_ROWS) {
        gridUndo.reset(savedGrid);
        setActiveRow(savedRow);
        setActiveCol(savedCol);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist whenever grid/cursor changes
  useEffect(() => {
    setSavedGrid(grid);
  }, [grid, setSavedGrid]);

  useEffect(() => {
    setSavedRow(activeRow);
    setSavedCol(activeCol);
  }, [activeRow, activeCol, setSavedRow, setSavedCol]);

  // --- Derived state ---
  const constraints = useMemo(() => buildConstraintsFromGrid(grid), [grid]);
  const candidates = useMemo(() => filterWords(WORDS, constraints), [constraints]);
  const analysis = useMemo(() => analyzeCandidates(candidates), [candidates]);
  const conflicts = useMemo(() => detectConflicts(constraints), [constraints]);

  // Track count deltas
  useEffect(() => {
    setPrevCount(prevCountRef.current);
    prevCountRef.current = analysis.count;
  }, [analysis.count]);

  // --- Input handlers ---
  const handleTileClick = useCallback(
    (row: number, col: number) => {
      const newGrid = cloneGrid(grid);
      const tile = newGrid[row][col];

      if (!tile.letter) {
        // Empty cell — just move the cursor there
        setActiveRow(row);
        setActiveCol(col);
        return;
      }

      // Has a letter — cycle grey → yellow → green → grey
      tile.state = STATE_CYCLE[tile.state];
      gridUndo.set(newGrid);
      setActiveRow(row);
      setActiveCol(col);
    },
    [grid, gridUndo]
  );

  const handleLetterInput = useCallback(
    (letter: string) => {
      const newGrid = cloneGrid(grid);
      const tile = newGrid[activeRow][activeCol];

      tile.letter = letter.toLowerCase();
      if (tile.state === 'empty' || tile.state === 'unknown') {
        tile.state = 'unknown';
      }

      gridUndo.set(newGrid);

      // Advance cursor
      if (activeCol < WORD_LENGTH - 1) {
        setActiveCol(c => c + 1);
      } else if (activeRow < MAX_ROWS - 1) {
        setActiveRow(r => r + 1);
        setActiveCol(0);
      }
    },
    [grid, gridUndo, activeRow, activeCol]
  );

  const handleBackspace = useCallback(() => {
    const newGrid = cloneGrid(grid);
    let row = activeRow;
    let col = activeCol;

    // If current cell is empty, go back
    if (!newGrid[row][col].letter) {
      if (col > 0) {
        col -= 1;
      } else if (row > 0) {
        row -= 1;
        col = WORD_LENGTH - 1;
      }
    }

    const tile = newGrid[row][col];
    if (tile.letter) {
      tile.letter = '';
      tile.state = 'empty';
      gridUndo.set(newGrid);
      setActiveRow(row);
      setActiveCol(col);
    }
  }, [grid, gridUndo, activeRow, activeCol]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === 'Backspace') {
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(key)) {
        handleLetterInput(key);
      }
    },
    [handleBackspace, handleLetterInput]
  );

  // Physical keyboard handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea elsewhere
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  const handleReset = useCallback(() => {
    const empty = createEmptyGrid();
    gridUndo.reset(empty);
    setActiveRow(0);
    setActiveCol(0);
    setPrevCount(null);
    prevCountRef.current = null;
  }, [gridUndo]);

  const handleUndo = useCallback(() => {
    gridUndo.undo();
  }, [gridUndo]);

  const handleToggleView = useCallback(() => {
    setView(v => (v === 'hints' ? 'candidates' : 'hints'));
  }, [setView]);

  const handleResolveConflict = useCallback(
    (conflict: Conflict) => {
      // Fix: remove the grey (excluded) marking for a letter that is confirmed.
      // We do this by finding all grey tiles for that letter and clearing them.
      const newGrid = cloneGrid(grid);
      for (const row of newGrid) {
        for (const tile of row) {
          if (tile.letter === conflict.letter && tile.state === 'grey') {
            tile.state = 'empty';
            tile.letter = '';
          }
        }
      }
      gridUndo.set(newGrid);
    },
    [grid, gridUndo]
  );

  const handleDismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, [setShowOnboarding]);

  return (
    <div className="app">
      <OfflineIndicator isOnline={isOnline} />

      {showOnboarding && (
        <OnboardingBanner onDismiss={handleDismissOnboarding} />
      )}

      <header className="app-header">
        <h1 className="app-title">Wordle Helper</h1>
        <p className="app-subtitle">Hints only — you solve it.</p>
      </header>

      <main className="app-main">
        <div className="input-area">
          <div className="grid-wrapper" aria-label="Guess input">
            <GuessGrid
              grid={grid}
              activeRow={activeRow}
              activeCol={activeCol}
              onTileClick={handleTileClick}
              onLetterInput={handleLetterInput}
              onBackspace={handleBackspace}
            />
          </div>
          <OnScreenKeyboard grid={grid} onKey={handleKey} />
        </div>

        <section className="panel-section" aria-label="Analysis">
          {view === 'hints' ? (
            <HintsPanel
              analysis={analysis}
              prevCount={prevCount}
              conflicts={conflicts}
              onResolveConflict={handleResolveConflict}
            />
          ) : (
            <CandidatesPanel candidates={candidates} />
          )}
        </section>
      </main>

      <BottomBar
        view={view}
        onToggleView={handleToggleView}
        onReset={handleReset}
        onUndo={handleUndo}
        canUndo={gridUndo.canUndo}
        candidateCount={candidates.length}
      />
    </div>
  );
}
