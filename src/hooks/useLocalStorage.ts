import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Like useState but automatically persists to / restores from localStorage.
 * Uses JSON serialisation. Silently falls back to in-memory state if
 * localStorage is unavailable (e.g. private-browsing restrictions).
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // ignore parse / access errors
    }
    return defaultValue;
  });

  // Avoid stale-closure issues by tracking key in a ref
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(state));
    } catch {
      // ignore write errors (e.g. storage quota exceeded)
    }
  }, [state]);

  const reset = useCallback(() => {
    setState(defaultValue);
    try {
      localStorage.removeItem(keyRef.current);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, setState, reset] as const;
}
