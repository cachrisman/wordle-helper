import React, { useState, useCallback } from 'react';

interface CandidatesPanelProps {
  candidates: string[];
}

const SHOW_RANDOM_N = 20;

function shuffleSlice(arr: string[], n: number): string[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function CandidatesPanel({ candidates }: CandidatesPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [randomSample, setRandomSample] = useState<string[] | null>(null);

  const handleShowRandom = useCallback(() => {
    setRandomSample(shuffleSlice(candidates, SHOW_RANDOM_N));
    setShowAll(false);
  }, [candidates]);

  const handleShowAll = useCallback(() => {
    setShowAll(true);
    setRandomSample(null);
  }, []);

  const displayed = showAll ? candidates : (randomSample ?? []);

  return (
    <section className="candidates-panel" aria-label="Candidates panel">
      <div className="candidates-header">
        <h3 className="candidates-title">
          Possible words
          <span className="candidates-count"> ({candidates.length})</span>
        </h3>
        <p className="candidates-disclaimer">
          This list narrows down what <em>could</em> be the answer — not a recommendation.
        </p>
      </div>

      {candidates.length === 0 ? (
        <p className="candidates-empty">No matching words found.</p>
      ) : (
        <>
          <div className="candidates-controls">
            <button
              className="btn btn--secondary"
              onClick={handleShowRandom}
              aria-label={`Show ${Math.min(SHOW_RANDOM_N, candidates.length)} random examples`}
            >
              Show {Math.min(SHOW_RANDOM_N, candidates.length)} random examples
            </button>
            {candidates.length <= 200 && (
              <button
                className="btn btn--ghost"
                onClick={handleShowAll}
                aria-label={`Show all ${candidates.length} words`}
              >
                Show all
              </button>
            )}
          </div>

          {displayed.length > 0 && (
            <ul
              className="candidates-list"
              aria-label={`${displayed.length} candidate words`}
            >
              {displayed.map(word => (
                <li key={word} className="candidates-list__item">
                  {word.toUpperCase()}
                </li>
              ))}
            </ul>
          )}

          {displayed.length === 0 && (
            <p className="candidates-hint">
              Tap "Show random examples" to see some possibilities without seeing the full list.
            </p>
          )}
        </>
      )}
    </section>
  );
}
