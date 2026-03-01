/** State of a single tile in the guess grid */
export type TileState = 'empty' | 'unknown' | 'grey' | 'yellow' | 'green';

/** A single tile: letter + state */
export interface TileData {
  letter: string; // '' if empty, otherwise single lowercase letter
  state: TileState;
}

/** 6 rows × 5 columns grid */
export type GridState = TileData[][];

/**
 * Compiled constraints derived from the grid.
 * All filtering logic depends on this structure.
 */
export interface Constraints {
  /** Position 0–4 → required letter (green) */
  greens: Record<number, string>;

  /**
   * letter → set of positions it must NOT occupy (yellow evidence).
   * Only letters with yellow evidence are present here.
   */
  yellowPositions: Record<string, Set<number>>;

  /** Minimum required count of each confirmed letter (green+yellow evidence) */
  minCount: Record<string, number>;

  /**
   * Maximum allowed count of each letter.
   * Derived when a letter appears multiple times in one guess but some
   * occurrences are grey → total = confirmed count.
   */
  maxCount: Record<string, number>;

  /** Letters that are fully excluded (grey and never confirmed elsewhere) */
  excluded: Set<string>;
}

/** Analysis of candidates */
export interface LetterFrequency {
  /** letter → fraction of candidates that contain this letter (0–1) */
  overall: Record<string, number>;
  /** position 0–4 → letter → fraction of candidates with that letter at that position */
  byPosition: Record<number, Record<string, number>>;
}

export interface CandidateAnalysis {
  count: number;
  frequency: LetterFrequency;
  /** Letters sorted by information value (highest first) */
  topExplorationLetters: string[];
}

/**
 * A candidate probe word scored by how many distinct colour-pattern groups
 * (partitions) it creates across the remaining candidates.
 * More partitions = more information gained from that guess.
 */
export interface ProbeWord {
  word: string;
  /** Number of distinct colour-pattern buckets across all remaining candidates */
  partitions: number;
  /** Average candidates per bucket (lower = more decisive) */
  avgGroupSize: number;
  /** True if this word is itself still a possible answer */
  isCandidate: boolean;
}

/** A single conflict detected in the constraints */
export interface Conflict {
  type: 'green-also-excluded' | 'yellow-also-excluded' | 'impossible-count';
  letter: string;
  description: string;
}
