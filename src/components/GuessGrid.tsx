import React, { useCallback } from 'react';
import type { GridState, TileState } from '../lib/types';

interface GuessGridProps {
  grid: GridState;
  activeRow: number;
  activeCol: number;
  onTileClick: (row: number, col: number) => void;
  onLetterInput: (letter: string) => void;
  onBackspace: () => void;
}

const STATE_CYCLE: Record<TileState, TileState> = {
  empty: 'grey',
  unknown: 'grey',
  grey: 'yellow',
  yellow: 'green',
  green: 'grey',
};

const STATE_LABELS: Record<TileState, string> = {
  empty: 'empty',
  unknown: 'unknown',
  grey: 'absent',
  yellow: 'present',
  green: 'correct position',
};

export function GuessGrid({
  grid,
  activeRow,
  activeCol,
  onTileClick,
  onLetterInput,
  onBackspace,
}: GuessGridProps) {
  const handleTileClick = useCallback(
    (row: number, col: number) => {
      onTileClick(row, col);
    },
    [onTileClick]
  );

  return (
    <div className="guess-grid" role="grid" aria-label="Wordle guess grid">
      {grid.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className="guess-row"
          role="row"
          aria-label={`Guess ${rowIdx + 1}`}
        >
          {row.map((tile, colIdx) => {
            const isActive = rowIdx === activeRow && colIdx === activeCol;
            const isActiveRow = rowIdx === activeRow;
            const cycledState = STATE_CYCLE[tile.state];

            return (
              <button
                key={colIdx}
                className={`tile tile--${tile.state}${isActive ? ' tile--active' : ''}`}
                role="gridcell"
                aria-label={
                  tile.letter
                    ? `${tile.letter.toUpperCase()}, ${STATE_LABELS[tile.state]}, row ${rowIdx + 1} col ${colIdx + 1}. Tap to mark as ${STATE_LABELS[cycledState]}`
                    : `Empty cell, row ${rowIdx + 1} col ${colIdx + 1}`
                }
                aria-pressed={tile.state !== 'empty' && tile.state !== 'unknown'}
                onClick={() => handleTileClick(rowIdx, colIdx)}
                tabIndex={isActiveRow ? 0 : -1}
              >
                <span aria-hidden="true">{tile.letter.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
