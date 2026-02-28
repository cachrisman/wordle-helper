import React from 'react';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  if (isOnline) return null;

  return (
    <div
      className="offline-indicator"
      role="status"
      aria-live="polite"
      aria-label="You are currently offline"
    >
      <span aria-hidden="true">⚡</span>
      Offline mode — all features still work
    </div>
  );
}
