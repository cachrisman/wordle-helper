import type { CandidateAnalysis, Constraints, Conflict, ProbeWord } from './types';

// ---------------------------------------------------------------------------
// Partition scoring  (mirrors the NYT WordleBot's core approach)
// ---------------------------------------------------------------------------

/**
 * Compute the Wordle colour pattern a guess would produce against a known answer.
 * Returns a 5-char string: 'g' green, 'y' yellow, 'b' black/grey.
 *
 * Uses the official two-pass algorithm to handle duplicate letters correctly:
 *   Pass 1 — mark exact-position matches (green).
 *   Pass 2 — mark present-but-wrong-position (yellow) for remaining letters.
 */
export function getPattern(guess: string, answer: string): string {
  const result   = ['b', 'b', 'b', 'b', 'b'];
  const answerCh = answer.split('') as (string | null)[];
  const guessCh  = guess.split('')  as (string | null)[];

  for (let i = 0; i < 5; i++) {
    if (guessCh[i] === answerCh[i]) {
      result[i]   = 'g';
      answerCh[i] = null;
      guessCh[i]  = null;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (guessCh[i] === null) continue;
    const j = answerCh.indexOf(guessCh[i] as string);
    if (j !== -1) { result[i] = 'y'; answerCh[j] = null; }
  }
  return result.join('');
}

/**
 * Score a guess by the number of distinct colour-pattern buckets it creates
 * across the remaining candidates.  More buckets = more information gained,
 * regardless of which answer turns out to be correct.
 * Ties are broken by smaller average bucket size (more decisive split).
 */
export function scoreGuess(
  guess: string,
  candidates: string[],
): { partitions: number; avgGroupSize: number } {
  const counts = new Map<string, number>();
  for (const answer of candidates) {
    const pat = getPattern(guess, answer);
    counts.set(pat, (counts.get(pat) ?? 0) + 1);
  }
  const partitions = counts.size;
  return { partitions, avgGroupSize: candidates.length / partitions };
}

/**
 * Return the top probe words from `vocabulary` ranked by partition count.
 * Only computed when candidates.length <= PROBE_THRESHOLD to stay snappy.
 */
const PROBE_THRESHOLD = 150;

export function getTopProbeWords(
  candidates: string[],
  vocabulary: string[],
  limit = 5,
): ProbeWord[] {
  if (candidates.length === 0 || candidates.length > PROBE_THRESHOLD) return [];
  const candidateSet = new Set(candidates);
  return vocabulary
    .map((word): ProbeWord => {
      const { partitions, avgGroupSize } = scoreGuess(word, candidates);
      return { word, partitions, avgGroupSize, isCandidate: candidateSet.has(word) };
    })
    .sort((a, b) =>
      b.partitions !== a.partitions
        ? b.partitions - a.partitions
        : a.avgGroupSize - b.avgGroupSize,
    )
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Frequency analysis
// ---------------------------------------------------------------------------

/**
 * Analyse the remaining candidate words to produce frequency stats and
 * exploration suggestions.
 */
export function analyzeCandidates(candidates: string[]): CandidateAnalysis {
  const n = candidates.length;

  if (n === 0) {
    return { count: 0, frequency: { overall: {}, byPosition: {} }, topExplorationLetters: [] };
  }

  const overallCount: Record<string, number> = {};
  const byPosCount: Record<number, Record<string, number>> = {};
  for (let pos = 0; pos < 5; pos++) byPosCount[pos] = {};

  for (const word of candidates) {
    const seen = new Set<string>();
    for (let pos = 0; pos < 5; pos++) {
      const ch = word[pos];
      if (!ch) continue;
      if (!seen.has(ch)) { overallCount[ch] = (overallCount[ch] ?? 0) + 1; seen.add(ch); }
      byPosCount[pos][ch] = (byPosCount[pos][ch] ?? 0) + 1;
    }
  }

  const overall: Record<string, number> = {};
  for (const [l, c] of Object.entries(overallCount)) overall[l] = c / n;

  const byPosition: Record<number, Record<string, number>> = {};
  for (let pos = 0; pos < 5; pos++) {
    byPosition[pos] = {};
    for (const [l, c] of Object.entries(byPosCount[pos])) byPosition[pos][l] = c / n;
  }

  // Letters closest to 50% split the remaining set most evenly.
  const topExplorationLetters = Object.entries(overall)
    .sort((a, b) => Math.abs(a[1] - 0.5) - Math.abs(b[1] - 0.5))
    .slice(0, 10)
    .map(([letter]) => letter);

  return { count: n, frequency: { overall, byPosition }, topExplorationLetters };
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

export function detectConflicts(constraints: Constraints): Conflict[] {
  const conflicts: Conflict[] = [];
  const { greens, yellowPositions, minCount, maxCount, excluded } = constraints;

  for (const [posStr, letter] of Object.entries(greens)) {
    if (excluded.has(letter)) {
      conflicts.push({
        type: 'green-also-excluded',
        letter,
        description: `"${letter.toUpperCase()}" is green at position ${Number(posStr) + 1} but also marked absent (grey).`,
      });
    }
  }

  for (const letter of Object.keys(yellowPositions)) {
    if (excluded.has(letter)) {
      conflicts.push({
        type: 'yellow-also-excluded',
        letter,
        description: `"${letter.toUpperCase()}" is marked present (yellow) but also absent (grey).`,
      });
    }
  }

  for (const letter of Object.keys(minCount)) {
    const min = minCount[letter] ?? 0;
    const max = maxCount[letter];
    if (max !== undefined && max < min) {
      conflicts.push({
        type: 'impossible-count',
        letter,
        description: `"${letter.toUpperCase()}" needs at least ${min} but at most ${max} — impossible.`,
      });
    }
  }

  return conflicts;
}
