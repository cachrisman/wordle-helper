import React from 'react';

interface BottomBarProps {
  view: 'hints' | 'candidates';
  onToggleView: () => void;
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  candidateCount: number;
}

export function BottomBar({
  view,
  onToggleView,
  onReset,
  onUndo,
  canUndo,
  candidateCount,
}: BottomBarProps) {
  return (
    <nav className="bottom-bar" aria-label="Actions">
      <button
        className="bottom-bar__btn bottom-bar__btn--reset"
        onClick={onReset}
        aria-label="Reset puzzle — clear all guesses"
        type="button"
      >
        <span aria-hidden="true">↺</span>
        <span className="bottom-bar__btn-label">Reset</span>
      </button>

      <button
        className="bottom-bar__btn bottom-bar__btn--undo"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo last change"
        aria-disabled={!canUndo}
        type="button"
      >
        <span aria-hidden="true">⎌</span>
        <span className="bottom-bar__btn-label">Undo</span>
      </button>

      <button
        className="bottom-bar__btn bottom-bar__btn--toggle"
        onClick={onToggleView}
        aria-label={
          view === 'hints'
            ? `Switch to Candidates view (${candidateCount} words)`
            : 'Switch to Hints view'
        }
        aria-pressed={view === 'candidates'}
        type="button"
      >
        <span aria-hidden="true">{view === 'hints' ? '📋' : '💡'}</span>
        <span className="bottom-bar__btn-label">
          {view === 'hints' ? `Candidates (${candidateCount})` : 'Hints'}
        </span>
      </button>
    </nav>
  );
}
