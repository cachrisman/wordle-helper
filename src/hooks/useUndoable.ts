import { useState, useCallback } from 'react';

interface UndoableState<T> {
  current: T;
  canUndo: boolean;
  set: (value: T) => void;
  undo: () => void;
  reset: (value: T) => void;
}

const MAX_HISTORY = 50;

/**
 * Like useState but with a limited undo history.
 * `set` pushes to history; `undo` pops the previous state.
 * `reset` clears history and sets a new initial state.
 */
export function useUndoable<T>(initialValue: T): UndoableState<T> {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [index, setIndex] = useState(0);

  const current = history[index];
  const canUndo = index > 0;

  const set = useCallback(
    (value: T) => {
      setHistory(prev => {
        // Discard any redo states above the current index
        const trimmed = prev.slice(0, index + 1);
        const next = [...trimmed, value].slice(-MAX_HISTORY);
        return next;
      });
      setIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    },
    [index]
  );

  const undo = useCallback(() => {
    if (canUndo) {
      setIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const reset = useCallback((value: T) => {
    setHistory([value]);
    setIndex(0);
  }, []);

  return { current, canUndo, set, undo, reset };
}
