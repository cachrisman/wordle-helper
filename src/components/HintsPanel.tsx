import React from 'react';
import type { CandidateAnalysis, Conflict, ProbeWord } from '../lib/types';

interface HintsPanelProps {
  analysis: CandidateAnalysis;
  prevCount: number | null;
  conflicts: Conflict[];
  probeWords: ProbeWord[];
  onResolveConflict?: (conflict: Conflict) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
          aria-label={`${label} in ${pct}% of remaining words`}
        />
      </div>
      <span className="freq-bar__pct">{pct}%</span>
    </div>
  );
}

function ProbeWordRow({ probe, total }: { probe: ProbeWord; total: number }) {
  // Max possible partitions for N candidates is min(N, 243)
  const maxPartitions = Math.min(total, 243);
  const quality = probe.partitions / maxPartitions; // 0–1
  const qualityClass =
    quality >= 0.66 ? 'probe--high' : quality >= 0.33 ? 'probe--mid' : 'probe--low';

  return (
    <div className={`probe-row ${qualityClass}`}>
      <span className="probe-row__word">
        {probe.word.toUpperCase()}
        {probe.isCandidate && <span className="probe-row__tag" title="Still a possible answer">★</span>}
      </span>
      <span className="probe-row__stats">
        <strong>{probe.partitions}</strong>{' '}
        <span className="probe-row__label">
          group{probe.partitions !== 1 ? 's' : ''}
        </span>
        <span className="probe-row__avg">
          ~{probe.avgGroupSize.toFixed(1)} per group
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function HintsPanel({
  analysis,
  prevCount,
  conflicts,
  probeWords,
  onResolveConflict,
}: HintsPanelProps) {
  const { count, frequency } = analysis;
  const delta =
    prevCount !== null && prevCount !== count ? prevCount - count : null;

  const topOverall = Object.entries(frequency.overall)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const positionColors = ['#e8a87c', '#85dcb8', '#a2d2ff', '#ffd6e0', '#c8b6ff'];

  return (
    <section className="hints-panel" aria-label="Hints panel">

      {/* Conflict alerts */}
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
                  Remove grey for {c.letter.toUpperCase()}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Remaining count */}
      <div className="hints-count" aria-live="polite" aria-atomic="true">
        <span className="hints-count__number">{count}</span>
        <span className="hints-count__label"> word{count !== 1 ? 's' : ''} remaining</span>
        {delta !== null && (
          <span
            className={`hints-count__delta hints-count__delta--${delta > 0 ? 'good' : 'bad'}`}
            aria-label={delta > 0 ? `reduced by ${delta}` : `increased by ${Math.abs(delta)}`}
          >
            {delta > 0 ? `−${delta}` : `+${Math.abs(delta)}`}
          </span>
        )}
      </div>

      {count === 0 && (
        <p className="hints-empty">No words match — check for conflicts above, or reset.</p>
      )}

      {count > 0 && (
        <>
          {/* ── Probe words (partition scoring) ── */}
          <div className="hints-section">
            <h3 className="hints-section__title">
              Suggested probes
              <span className="hints-section__subtitle">
                {probeWords.length > 0
                  ? ' — ranked by information gain'
                  : count > 150
                  ? ' — available once below 150 words'
                  : ''}
              </span>
            </h3>

            {probeWords.length > 0 ? (
              <>
                <p className="hints-tip">
                  Each probe is scored by how many distinct colour-pattern groups
                  it splits the remaining {count} words into.
                  More groups = more information, whatever the answer turns out to be.
                  ★ marks words that are still possible answers.
                </p>
                <div
                  className="probe-list"
                  aria-label="Top probe words by information gain"
                >
                  {probeWords.map(p => (
                    <ProbeWordRow key={p.word} probe={p} total={count} />
                  ))}
                </div>
                <p className="hints-tip hints-tip--subtle">
                  These are informational — not recommendations.
                  The puzzle is yours to solve.
                </p>
              </>
            ) : count <= 150 ? (
              <p className="hints-empty-small">Computing…</p>
            ) : (
              <p className="hints-empty-small">
                Enter more guesses to narrow the field. Probe analysis appears
                once fewer than 150 words remain.
              </p>
            )}
          </div>

          {/* ── Letter frequency ── */}
          <div className="hints-section">
            <h3 className="hints-section__title">Letter frequency</h3>
            <div className="freq-list" aria-label="Letter frequencies in remaining words">
              {topOverall.map(([letter, freq]) => (
                <FrequencyBar key={letter} value={freq} label={letter} />
              ))}
              {topOverall.length === 0 && (
                <p className="hints-empty-small">No data yet.</p>
              )}
            </div>
          </div>

          {/* ── Per-position best letters ── */}
          <div className="hints-section">
            <h3 className="hints-section__title">Best letter by position</h3>
            <div className="pos-grid">
              {[0, 1, 2, 3, 4].map(pos => {
                const best = Object.entries(frequency.byPosition[pos] ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);
                return (
                  <div
                    key={pos}
                    className="pos-cell"
                    style={{ borderColor: positionColors[pos] }}
                    aria-label={`Position ${pos + 1}`}
                  >
                    <div className="pos-cell__header" style={{ backgroundColor: positionColors[pos] }}>
                      #{pos + 1}
                    </div>
                    <div className="pos-cell__letters">
                      {best.map(([letter, freq]) => (
                        <div key={letter} className="pos-cell__letter">
                          <span className="pos-cell__letter-char">{letter.toUpperCase()}</span>
                          <span className="pos-cell__letter-pct">{Math.round(freq * 100)}%</span>
                        </div>
                      ))}
                      {best.length === 0 && <span className="pos-cell__empty">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
