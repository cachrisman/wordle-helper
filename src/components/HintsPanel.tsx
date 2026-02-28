import React from 'react';
import type { CandidateAnalysis, Conflict } from '../lib/types';

interface HintsPanelProps {
  analysis: CandidateAnalysis;
  prevCount: number | null;
  conflicts: Conflict[];
  onResolveConflict?: (conflict: Conflict) => void;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

function FrequencyBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="freq-bar" title={`${label}: ${pct}%`}>
      <span className="freq-bar__label">{label.toUpperCase()}</span>
      <div className="freq-bar__track">
        <div
          className="freq-bar__fill"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} appears in ${pct}% of remaining candidates`}
        />
      </div>
      <span className="freq-bar__pct">{pct}%</span>
    </div>
  );
}

export function HintsPanel({ analysis, prevCount, conflicts, onResolveConflict }: HintsPanelProps) {
  const { count, frequency, topExplorationLetters } = analysis;

  const delta =
    prevCount !== null && prevCount !== count
      ? prevCount - count
      : null;

  // Top 8 letters by overall frequency (for the overview bar chart)
  const topOverall = Object.entries(frequency.overall)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const positionColors = ['#e8a87c', '#85dcb8', '#a2d2ff', '#ffd6e0', '#c8b6ff'];

  return (
    <section className="hints-panel" aria-label="Hints panel">
      {/* --- Conflict alerts --- */}
      {conflicts.length > 0 && (
        <div className="conflicts" role="alert" aria-live="polite">
          <h3 className="conflicts__title">⚠ Conflict detected</h3>
          {conflicts.map((c, i) => (
            <div key={i} className="conflict-item">
              <p className="conflict-item__desc">{c.description}</p>
              {onResolveConflict && (
                <button
                  className="conflict-item__fix"
                  onClick={() => onResolveConflict(c)}
                  aria-label={`Fix conflict for letter ${c.letter.toUpperCase()}`}
                >
                  Remove exclusion for {c.letter.toUpperCase()}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- Remaining count --- */}
      <div className="hints-count" aria-live="polite" aria-atomic="true">
        <span className="hints-count__number">{count}</span>
        <span className="hints-count__label"> word{count !== 1 ? 's' : ''} remaining</span>
        {delta !== null && (
          <span
            className={`hints-count__delta hints-count__delta--${delta > 0 ? 'good' : 'bad'}`}
            aria-label={`Changed by ${delta > 0 ? '-' : '+'}${Math.abs(delta)}`}
          >
            {delta > 0 ? `−${delta}` : `+${Math.abs(delta)}`}
          </span>
        )}
      </div>

      {count === 0 && (
        <p className="hints-empty">No words match. Check for conflicts above or reset.</p>
      )}

      {count > 0 && (
        <>
          {/* --- Letter frequency overview --- */}
          <div className="hints-section">
            <h3 className="hints-section__title">Letter frequency in remaining words</h3>
            <div className="freq-list" aria-label="Letter frequencies">
              {topOverall.map(([letter, freq]) => (
                <FrequencyBar key={letter} value={freq} label={letter} />
              ))}
              {topOverall.length === 0 && (
                <p className="hints-empty-small">No frequency data yet.</p>
              )}
            </div>
          </div>

          {/* --- Per-position frequency --- */}
          <div className="hints-section">
            <h3 className="hints-section__title">Best letter per position</h3>
            <div className="pos-grid">
              {[0, 1, 2, 3, 4].map(pos => {
                const posData = frequency.byPosition[pos] ?? {};
                const best = Object.entries(posData)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                return (
                  <div
                    key={pos}
                    className="pos-cell"
                    style={{ borderColor: positionColors[pos] }}
                    aria-label={`Position ${pos + 1}`}
                  >
                    <div
                      className="pos-cell__header"
                      style={{ backgroundColor: positionColors[pos] }}
                    >
                      #{pos + 1}
                    </div>
                    <div className="pos-cell__letters">
                      {best.map(([letter, freq]) => (
                        <div key={letter} className="pos-cell__letter">
                          <span className="pos-cell__letter-char">{letter.toUpperCase()}</span>
                          <span className="pos-cell__letter-pct">
                            {Math.round(freq * 100)}%
                          </span>
                        </div>
                      ))}
                      {best.length === 0 && <span className="pos-cell__empty">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- Exploration suggestions --- */}
          <div className="hints-section">
            <h3 className="hints-section__title">Exploration suggestions</h3>
            <p className="hints-tip">
              Try a word containing these high-value letters to maximise what you learn.
              Avoid repeating letters you've already confirmed.
            </p>
            <div className="explore-letters" aria-label="Suggested letters to explore">
              {topExplorationLetters.map(letter => (
                <span key={letter} className="explore-badge" aria-label={letter.toUpperCase()}>
                  {letter.toUpperCase()}
                </span>
              ))}
              {topExplorationLetters.length === 0 && (
                <span className="hints-empty-small">Enter some guesses to see suggestions.</span>
              )}
            </div>
            <p className="hints-tip hints-tip--subtle">
              Words with diverse, unchecked letters give you the most information.
              This tool won't pick an answer — the discovery is yours.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
