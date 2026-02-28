import type { GridState, Constraints, TileData } from './types';

/**
 * Derive a Constraints object from the current grid state.
 *
 * Duplicate-handling rules (mirrors official Wordle scoring):
 * - Within a single guess row, first collect greens, then process the rest
 *   against the remaining (unmatched) letters to determine yellow vs grey.
 * - If a letter appears N times in a row as green/yellow, minCount >= N.
 * - If a letter appears more times in a row than are confirmed, we know
 *   the exact count: maxCount = confirmed count.
 */
export function buildConstraintsFromGrid(grid: GridState): Constraints {
  const greens: Record<number, string> = {};
  const yellowPositions: Record<string, Set<number>> = {};
  const minCount: Record<string, number> = {};
  const maxCount: Record<string, number> = {};
  const excluded: Set<string> = new Set();

  for (const row of grid) {
    // Skip rows that have no filled tiles
    if (row.every(t => t.letter === '' || t.state === 'empty' || t.state === 'unknown')) {
      continue;
    }

    // --- Per-row duplicate analysis ---
    // Count how many times each letter is confirmed (green or yellow) in this row
    const confirmedInRow: Record<string, number> = {};
    // Count total occurrences of each letter in this row
    const totalInRow: Record<string, number> = {};
    // Count grey (non-confirmed) occurrences per letter in this row
    const greyInRow: Record<string, number> = {};

    for (const tile of row) {
      if (!tile.letter) continue;
      totalInRow[tile.letter] = (totalInRow[tile.letter] ?? 0) + 1;
      if (tile.state === 'green' || tile.state === 'yellow') {
        confirmedInRow[tile.letter] = (confirmedInRow[tile.letter] ?? 0) + 1;
      } else if (tile.state === 'grey') {
        greyInRow[tile.letter] = (greyInRow[tile.letter] ?? 0) + 1;
      }
    }

    // Update global minCount / maxCount based on this row
    for (const [letter, count] of Object.entries(confirmedInRow)) {
      // Minimum: at least as many as confirmed
      minCount[letter] = Math.max(minCount[letter] ?? 0, count);

      // If there are also grey instances of this letter in the same row,
      // we know the exact count = confirmedInRow[letter]
      if (greyInRow[letter] && greyInRow[letter] > 0) {
        const exact = count;
        // maxCount is the tightest upper bound across rows
        if (maxCount[letter] === undefined || exact < maxCount[letter]) {
          maxCount[letter] = exact;
        }
      }
    }

    // Now process each tile for greens / yellows / exclusions
    for (let col = 0; col < row.length; col++) {
      const tile: TileData = row[col];
      if (!tile.letter) continue;

      if (tile.state === 'green') {
        greens[col] = tile.letter;
      } else if (tile.state === 'yellow') {
        if (!yellowPositions[tile.letter]) {
          yellowPositions[tile.letter] = new Set();
        }
        yellowPositions[tile.letter].add(col);
      } else if (tile.state === 'grey') {
        // Only mark excluded if this letter was NEVER confirmed anywhere in
        // this row (i.e., confirmedInRow is 0 or undefined for this letter).
        // If confirmed elsewhere in the same row, we already set maxCount.
        if (!confirmedInRow[tile.letter]) {
          excluded.add(tile.letter);
        }
      }
    }
  }

  // Clean up: a letter should NOT be in excluded if it has min-count > 0.
  // This handles cases where the same letter was grey in one guess but
  // green/yellow in another.
  for (const letter of Object.keys(minCount)) {
    if ((minCount[letter] ?? 0) > 0) {
      excluded.delete(letter);
    }
  }
  for (const letter of Object.keys(yellowPositions)) {
    excluded.delete(letter);
  }
  for (const letter of Object.values(greens)) {
    excluded.delete(letter);
  }

  return { greens, yellowPositions, minCount, maxCount, excluded };
}

/** Create a blank 6×5 grid. */
export function createEmptyGrid(): GridState {
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 5 }, () => ({ letter: '', state: 'empty' as const }))
  );
}
