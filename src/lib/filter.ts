import type { Constraints } from './types';

/**
 * Filter the word list down to candidates that satisfy all constraints.
 *
 * @param words  Full word list (lowercase 5-letter strings)
 * @param constraints  Derived from buildConstraintsFromGrid
 * @returns  Subset of words that satisfy every constraint
 */
export function filterWords(words: string[], constraints: Constraints): string[] {
  const { greens, yellowPositions, minCount, maxCount, excluded } = constraints;

  return words.filter(word => {
    // 1. Green checks: exact position
    for (const [posStr, letter] of Object.entries(greens)) {
      const pos = Number(posStr);
      if (word[pos] !== letter) return false;
    }

    // 2. Excluded checks: letter must not appear (unless it has minCount > 0)
    for (const letter of excluded) {
      if (word.includes(letter)) return false;
    }

    // 3. Yellow position checks: letter must be present but NOT at the
    //    disallowed positions
    for (const [letter, badPositions] of Object.entries(yellowPositions)) {
      if (!word.includes(letter)) return false;
      for (const pos of badPositions) {
        if (word[pos] === letter) return false;
      }
    }

    // 4. Count checks (min and max)
    const letterCount = countLetters(word);

    for (const [letter, min] of Object.entries(minCount)) {
      if ((letterCount[letter] ?? 0) < min) return false;
    }

    for (const [letter, max] of Object.entries(maxCount)) {
      if ((letterCount[letter] ?? 0) > max) return false;
    }

    return true;
  });
}

/** Count occurrences of each letter in a word. */
export function countLetters(word: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of word) {
    counts[ch] = (counts[ch] ?? 0) + 1;
  }
  return counts;
}
