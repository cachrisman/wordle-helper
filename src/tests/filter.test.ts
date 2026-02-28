import { describe, it, expect } from 'vitest';
import { buildConstraintsFromGrid, createEmptyGrid } from '../lib/constraints';
import { filterWords } from '../lib/filter';
import type { GridState, TileData } from '../lib/types';

// Helper: build a grid from plain descriptions
// Row is an array of [letter, state] pairs
type TileDesc = [string, TileData['state']];

function makeGrid(rows: TileDesc[][]): GridState {
  const base = createEmptyGrid();
  rows.forEach((row, r) => {
    row.forEach(([letter, state], c) => {
      base[r][c] = { letter, state };
    });
  });
  return base;
}

const SAMPLE_WORDS = [
  'apple', 'april', 'arson', 'crane', 'craze', 'creep',
  'spell', 'spill', 'spelt', 'speed', 'snare', 'stare',
  'slate', 'shine', 'share', 'shape', 'shard', 'shale',
  'grace', 'graze', 'grape', 'great', 'greet', 'greed',
  'aback', 'abbey', 'abbey', 'abbot', 'above', 'abuse',
  'balls', 'belle', 'bless', 'bliss', 'blaze', 'blade',
  'daddy', 'daily', 'dairy', 'dance', 'darts', 'dates',
  'eerie', 'eight', 'elite', 'ember', 'empty', 'epoch',
  'llama', 'llano', 'lodge', 'logic', 'loopy', 'lover',
  'rabid', 'rabbi', 'radar', 'rates', 'raven', 'react',
  'tapir', 'tasty', 'taunt', 'taper', 'trace', 'track',
  'ultra', 'umbra', 'uncle', 'undid', 'union', 'until',
  'valve', 'vapor', 'venom', 'verve', 'vigil', 'virus',
  'water', 'witch', 'world', 'worry', 'worth', 'wrath',
];

// -----------------------------------------------------------------
// Basic filtering
// -----------------------------------------------------------------

describe('filterWords — basic green constraints', () => {
  it('matches a green letter at the correct position', () => {
    const grid = makeGrid([[
      ['a', 'green'],
      ['p', 'unknown'],
      ['p', 'unknown'],
      ['l', 'unknown'],
      ['e', 'unknown'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result.every(w => w[0] === 'a')).toBe(true);
    expect(result).toContain('apple');
    expect(result).toContain('april');
    expect(result).not.toContain('crane');
  });

  it('matches multiple greens', () => {
    const grid = makeGrid([[
      ['c', 'green'],
      ['r', 'green'],
      ['a', 'unknown'],
      ['n', 'unknown'],
      ['e', 'unknown'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result.every(w => w[0] === 'c' && w[1] === 'r')).toBe(true);
  });
});

describe('filterWords — yellow constraints', () => {
  it('includes words with yellow letter NOT in its disallowed position', () => {
    const grid = makeGrid([[
      ['a', 'unknown'],
      ['p', 'unknown'],
      ['p', 'yellow'], // 'p' present but not at position 2
      ['l', 'unknown'],
      ['e', 'unknown'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    const result = filterWords(SAMPLE_WORDS, constraints);
    // All results must contain 'p' and 'p' must not be at index 2
    expect(result.every(w => w.includes('p') && w[2] !== 'p')).toBe(true);
  });
});

describe('filterWords — grey constraints', () => {
  it('excludes words containing a grey letter', () => {
    const grid = makeGrid([[
      ['z', 'grey'],
      ['x', 'unknown'],
      ['x', 'unknown'],
      ['x', 'unknown'],
      ['x', 'unknown'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result.every(w => !w.includes('z'))).toBe(true);
  });

  it('does not exclude a letter that is also confirmed green', () => {
    // Row 0: 'a' is green at pos 0, Row 1: 'a' is grey at pos 0 (user error / test data)
    const grid = makeGrid([
      [['a', 'green'], ['p', 'unknown'], ['p', 'unknown'], ['l', 'unknown'], ['e', 'unknown']],
      [['a', 'grey'],  ['r', 'unknown'], ['s', 'unknown'], ['o', 'unknown'], ['n', 'unknown']],
    ]);
    const constraints = buildConstraintsFromGrid(grid);
    // 'a' must still be present since it has a green in row 0
    expect(constraints.excluded.has('a')).toBe(false);
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result.every(w => w[0] === 'a')).toBe(true);
  });
});

// -----------------------------------------------------------------
// Duplicate letter handling
// -----------------------------------------------------------------

describe('filterWords — duplicate letter logic', () => {
  it('enforces minCount >= 2 when same letter is yellow twice', () => {
    // Guess: s-p-e-l-l with both L's yellow → word needs at least 2 L's
    const grid = makeGrid([[
      ['s', 'unknown'],
      ['p', 'unknown'],
      ['e', 'unknown'],
      ['l', 'yellow'], // 'l' at pos 3 is present
      ['l', 'yellow'], // 'l' at pos 4 is present
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    expect(constraints.minCount['l']).toBeGreaterThanOrEqual(2);
    // Words with only one 'l' should be excluded
    const words = ['belle', 'balls', 'spell', 'bliss', 'llano', 'llama'];
    const result = filterWords(words, constraints);
    // 'spell' has 2 l's and neither at pos 3 or 4? spell = s,p,e,l,l → l at pos 3,4
    // pos 3 and 4 are disallowed for 'l', so 'spell' won't pass (l IS at pos 3 and 4)
    // 'llano' has l at pos 0,1 (not 3,4) and has 2 l's — should pass
    expect(result).toContain('llano');
    expect(result).toContain('llama');
    // 'balls' has 1 'l' → fail minCount
    expect(result).not.toContain('balls');
  });

  it('enforces maxCount when letter appears green+grey in same row', () => {
    // Guess: s-p-e-l-l with first 'l' (pos 3) green and second 'l' (pos 4) grey
    // → word has exactly 1 'l'
    const grid = makeGrid([[
      ['s', 'unknown'],
      ['p', 'unknown'],
      ['e', 'unknown'],
      ['l', 'green'],  // l confirmed at pos 3
      ['l', 'grey'],   // second l is absent → maxCount = 1
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    expect(constraints.maxCount['l']).toBe(1);
    expect(constraints.minCount['l']).toBeGreaterThanOrEqual(1);
    const words = ['spell', 'belle', 'balls', 'atlas', 'sleet'];
    const result = filterWords(words, constraints);
    // 'spell' has l at pos 3 (green ✓) but also pos 4 → 2 l's → fails maxCount
    expect(result).not.toContain('spell');
    // 'balls' has l at pos 3 (green ✓) with only 1 l → should be ok
    // b,a,l,l,s → l at pos 2 and 3. Green requires pos 3. 'balls': b(0)a(1)l(2)l(3)s(4) → l at 3 ✓ but 2 l's → fails maxCount
    expect(result).not.toContain('balls');
  });

  it('handles grey letter that was also yellow in a previous row', () => {
    // Row 0: 'e' yellow at pos 2
    // Row 1: 'e' grey at pos 0 (different guess)
    // Result: 'e' must appear, not at pos 2, and not excluded
    const grid = makeGrid([
      [['c', 'unknown'], ['r', 'unknown'], ['e', 'yellow'], ['e', 'unknown'], ['k', 'unknown']],
      [['e', 'grey'],    ['m', 'unknown'], ['b', 'unknown'], ['e', 'unknown'], ['r', 'unknown']],
    ]);
    const constraints = buildConstraintsFromGrid(grid);
    // 'e' is confirmed (yellow) → must not be excluded
    expect(constraints.excluded.has('e')).toBe(false);
    // minCount for 'e' should be at least 1
    expect(constraints.minCount['e'] ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('filters words with two confirmed identical letters correctly', () => {
    // Both e's confirmed (green+yellow in a row with 2 e's)
    // e at pos 0 green, e at pos 4 yellow → need 2 e's
    const grid = makeGrid([[
      ['e', 'green'],
      ['m', 'unknown'],
      ['b', 'unknown'],
      ['e', 'yellow'], // 'e' present but not at pos 3
      ['r', 'unknown'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    expect(constraints.minCount['e']).toBeGreaterThanOrEqual(2);
    const words = ['eerie', 'ember', 'elect', 'evoke', 'eight'];
    const result = filterWords(words, constraints);
    // 'eerie' = e(0)e(1)r(2)i(3)e(4) → 3 e's, e at pos 0 ✓, 'e' present but not at pos 3 ✓
    expect(result).toContain('eerie');
    // 'eight' = e(0)i(1)g(2)h(3)t(4) → 1 e → fails minCount(2)
    expect(result).not.toContain('eight');
  });
});

// -----------------------------------------------------------------
// Edge cases
// -----------------------------------------------------------------

describe('filterWords — edge cases', () => {
  it('returns all words when constraints are empty', () => {
    const constraints = buildConstraintsFromGrid(createEmptyGrid());
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result.length).toBe(SAMPLE_WORDS.length);
  });

  it('returns empty array when no word matches', () => {
    const grid = makeGrid([[
      ['q', 'green'],
      ['q', 'green'],
      ['q', 'green'],
      ['q', 'green'],
      ['q', 'green'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result).toHaveLength(0);
  });

  it('handles all-grey row (word fully absent)', () => {
    const grid = makeGrid([[
      ['z', 'grey'],
      ['x', 'grey'],
      ['q', 'grey'],
      ['j', 'grey'],
      ['v', 'grey'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result.every(w => !w.includes('z') && !w.includes('x') &&
      !w.includes('q') && !w.includes('j') && !w.includes('v'))).toBe(true);
  });

  it('handles a perfect all-green row', () => {
    const grid = makeGrid([[
      ['c', 'green'],
      ['r', 'green'],
      ['a', 'green'],
      ['n', 'green'],
      ['e', 'green'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    const result = filterWords(SAMPLE_WORDS, constraints);
    expect(result).toEqual(['crane']);
  });

  it('handles rows with only unknown state (no constraints)', () => {
    const grid = makeGrid([[
      ['t', 'unknown'],
      ['e', 'unknown'],
      ['s', 'unknown'],
      ['t', 'unknown'],
      ['s', 'unknown'],
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    // Unknown tiles add no constraints
    expect(Object.keys(constraints.greens)).toHaveLength(0);
    expect(Object.keys(constraints.yellowPositions)).toHaveLength(0);
    expect(constraints.excluded.size).toBe(0);
  });

  it('correctly handles a word with 3 occurrences of same letter', () => {
    // If 'e' is marked yellow at positions 0, 2 and green at position 4
    const grid = makeGrid([[
      ['e', 'yellow'], // not at pos 0
      ['m', 'unknown'],
      ['e', 'yellow'], // not at pos 2
      ['r', 'unknown'],
      ['e', 'green'],  // e at pos 4 confirmed
    ]]);
    const constraints = buildConstraintsFromGrid(grid);
    expect(constraints.minCount['e']).toBeGreaterThanOrEqual(3);
    expect(constraints.greens[4]).toBe('e');
    // 'eerie' = e(0)e(1)r(2)i(3)e(4) → 3 e's, pos4 e ✓, e not at pos 0 (fails: e IS at pos 0 of eerie)
    const words = ['eerie', 'geese', 'creep', 'agree'];
    const result = filterWords(words, constraints);
    // All must have ≥3 e's and e at pos 4
    result.forEach(w => {
      const count = w.split('').filter(c => c === 'e').length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(w[4]).toBe('e');
    });
  });
});

// -----------------------------------------------------------------
// buildConstraintsFromGrid
// -----------------------------------------------------------------

describe('buildConstraintsFromGrid', () => {
  it('builds greens correctly', () => {
    const grid = makeGrid([[
      ['s', 'green'],
      ['t', 'unknown'],
      ['a', 'green'],
      ['r', 'unknown'],
      ['e', 'unknown'],
    ]]);
    const c = buildConstraintsFromGrid(grid);
    expect(c.greens[0]).toBe('s');
    expect(c.greens[2]).toBe('a');
    expect(c.greens[1]).toBeUndefined();
  });

  it('builds yellowPositions correctly', () => {
    const grid = makeGrid([[
      ['s', 'yellow'],
      ['t', 'unknown'],
      ['a', 'yellow'],
      ['r', 'unknown'],
      ['e', 'unknown'],
    ]]);
    const c = buildConstraintsFromGrid(grid);
    expect(c.yellowPositions['s']).toContain(0);
    expect(c.yellowPositions['a']).toContain(2);
  });

  it('accumulates yellow positions across rows', () => {
    const grid = makeGrid([
      [['s', 'yellow'], ['t', 'unknown'], ['a', 'unknown'], ['r', 'unknown'], ['e', 'unknown']],
      [['x', 'unknown'], ['s', 'yellow'], ['x', 'unknown'], ['x', 'unknown'], ['x', 'unknown']],
    ]);
    const c = buildConstraintsFromGrid(grid);
    // 's' was yellow at pos 0 in row0, and pos 1 in row1
    expect(c.yellowPositions['s'].has(0)).toBe(true);
    expect(c.yellowPositions['s'].has(1)).toBe(true);
  });

  it('does not put confirmed letters in excluded', () => {
    const grid = makeGrid([[
      ['a', 'green'],
      ['b', 'yellow'],
      ['c', 'grey'],
      ['d', 'grey'],
      ['e', 'green'],
    ]]);
    const c = buildConstraintsFromGrid(grid);
    expect(c.excluded.has('a')).toBe(false);
    expect(c.excluded.has('b')).toBe(false);
    expect(c.excluded.has('c')).toBe(true);
    expect(c.excluded.has('d')).toBe(true);
  });
});
