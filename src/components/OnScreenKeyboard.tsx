import React from 'react';
import type { GridState } from '../lib/types';

interface OnScreenKeyboardProps {
  grid: GridState;
  onKey: (key: string) => void;
}

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['Enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
];

/**
 * Derive the "best known state" for each letter across all guessed rows.
 * Priority: green > yellow > grey > unknown
 */
function deriveKeyStates(grid: GridState): Record<string, string> {
  const priority: Record<string, number> = { green: 3, yellow: 2, grey: 1 };
  const states: Record<string, string> = {};

  for (const row of grid) {
    for (const tile of row) {
      if (!tile.letter || tile.state === 'empty' || tile.state === 'unknown') continue;
      const current = states[tile.letter];
      const currentPrio = current ? (priority[current] ?? 0) : 0;
      const newPrio = priority[tile.state] ?? 0;
      if (newPrio > currentPrio) {
        states[tile.letter] = tile.state;
      }
    }
  }

  return states;
}

export function OnScreenKeyboard({ grid, onKey }: OnScreenKeyboardProps) {
  const keyStates = deriveKeyStates(grid);

  return (
    <div className="osk" role="group" aria-label="On-screen keyboard">
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="osk__row">
          {row.map(key => {
            const isSpecial = key === 'Enter' || key === '⌫';
            const state = isSpecial ? undefined : keyStates[key];

            return (
              <button
                key={key}
                className={[
                  'osk__key',
                  isSpecial ? 'osk__key--wide' : '',
                  state ? `osk__key--${state}` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={
                  key === '⌫'
                    ? 'Backspace'
                    : key === 'Enter'
                    ? 'Enter'
                    : `${key.toUpperCase()}${state ? `, ${state}` : ''}`
                }
                onClick={() => onKey(key === '⌫' ? 'Backspace' : key)}
                type="button"
              >
                {key.toUpperCase()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
