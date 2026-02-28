import React from 'react';

interface OnboardingBannerProps {
  onDismiss: () => void;
}

export function OnboardingBanner({ onDismiss }: OnboardingBannerProps) {
  return (
    <div
      className="onboarding"
      role="dialog"
      aria-modal="false"
      aria-label="Welcome to Wordle Helper"
    >
      <div className="onboarding__content">
        <h2 className="onboarding__title">Welcome to Wordle Helper</h2>
        <p className="onboarding__text">
          This tool gives <strong>hints</strong>, not answers. It narrows down
          possibilities and suggests letters worth exploring — the fun of solving
          the puzzle stays with you.
        </p>
        <ol className="onboarding__steps">
          <li>Type a letter to fill a cell, or tap a cell to cycle its state.</li>
          <li>
            Tap a tile to mark it:{' '}
            <span className="tile-demo tile-demo--grey">Grey</span> = absent,{' '}
            <span className="tile-demo tile-demo--yellow">Yellow</span> = wrong position,{' '}
            <span className="tile-demo tile-demo--green">Green</span> = correct.
          </li>
          <li>The Hints panel updates instantly as you enter guesses.</li>
        </ol>
        <button
          className="btn btn--primary onboarding__dismiss"
          onClick={onDismiss}
          aria-label="Got it, dismiss welcome message"
        >
          Got it — let's go!
        </button>
      </div>
    </div>
  );
}
