import type { CandidateAnalysis, Constraints, Conflict } from './types';

/**
 * Analyse the remaining candidate words to produce frequency stats and
 * exploration suggestions.
 */
export function analyzeCandidates(candidates: string[]): CandidateAnalysis {
  const n = candidates.length;

  if (n === 0) {
    return {
      count: 0,
      frequency: { overall: {}, byPosition: {} },
      topExplorationLetters: [],
    };
  }

  // --- Letter frequency ---
  const overallCount: Record<string, number> = {};
  const byPosCount: Record<number, Record<string, number>> = {};

  for (let pos = 0; pos < 5; pos++) {
    byPosCount[pos] = {};
  }

  for (const word of candidates) {
    // For overall, count each letter at most once per word
    const seen = new Set<string>();
    for (let pos = 0; pos < 5; pos++) {
      const ch = word[pos];
      if (ch) {
        if (!seen.has(ch)) {
          overallCount[ch] = (overallCount[ch] ?? 0) + 1;
          seen.add(ch);
        }
        byPosCount[pos][ch] = (byPosCount[pos][ch] ?? 0) + 1;
      }
    }
  }

  const overall: Record<string, number> = {};
  for (const [letter, count] of Object.entries(overallCount)) {
    overall[letter] = count / n;
  }

  const byPosition: Record<number, Record<string, number>> = {};
  for (let pos = 0; pos < 5; pos++) {
    byPosition[pos] = {};
    for (const [letter, count] of Object.entries(byPosCount[pos])) {
      byPosition[pos][letter] = count / n;
    }
  }

  // --- Exploration suggestions ---
  // Rank letters by how much information they provide.
  // A letter with frequency ~0.5 splits the candidate set most evenly.
  // We want letters that are useful but NOT already confirmed.
  const topExplorationLetters = Object.entries(overall)
    .sort((a, b) => {
      // Prefer letters close to 0.5 (maximum information split)
      const scoreA = 1 - Math.abs(a[1] - 0.5) * 2;
      const scoreB = 1 - Math.abs(b[1] - 0.5) * 2;
      return scoreB - scoreA;
    })
    .slice(0, 10)
    .map(([letter]) => letter);

  return {
    count: n,
    frequency: { overall, byPosition },
    topExplorationLetters,
  };
}

/**
 * Detect contradictions in the constraints (e.g. a letter is both green
 * and in the excluded set).
 */
export function detectConflicts(constraints: Constraints): Conflict[] {
  const conflicts: Conflict[] = [];
  const { greens, yellowPositions, minCount, maxCount, excluded } = constraints;

  // Green letter also excluded
  for (const [posStr, letter] of Object.entries(greens)) {
    if (excluded.has(letter)) {
      conflicts.push({
        type: 'green-also-excluded',
        letter,
        description: `"${letter.toUpperCase()}" is marked green at position ${Number(posStr) + 1} but also excluded (grey).`,
      });
    }
  }

  // Yellow letter also excluded
  for (const letter of Object.keys(yellowPositions)) {
    if (excluded.has(letter)) {
      conflicts.push({
        type: 'yellow-also-excluded',
        letter,
        description: `"${letter.toUpperCase()}" is marked yellow (present) but also excluded (grey).`,
      });
    }
  }

  // Impossible count: maxCount < minCount
  for (const letter of Object.keys(minCount)) {
    const min = minCount[letter] ?? 0;
    const max = maxCount[letter];
    if (max !== undefined && max < min) {
      conflicts.push({
        type: 'impossible-count',
        letter,
        description: `"${letter.toUpperCase()}" needs at least ${min} but can have at most ${max}.`,
      });
    }
  }

  return conflicts;
}
