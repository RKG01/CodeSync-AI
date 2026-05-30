import React from 'react';

export default function DuelTimer({ remainingSeconds, totalSeconds }) {
  if (remainingSeconds === null || remainingSeconds === undefined) {
    return <div className="duel-timer">--:--</div>;
  }

  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.max(0, remainingSeconds) % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Determine urgency level
  const ratio = totalSeconds ? remainingSeconds / totalSeconds : 1;
  let urgency = 'normal';
  if (ratio <= 0.1) urgency = 'critical';
  else if (ratio <= 0.25) urgency = 'warning';
  else if (ratio <= 0.5) urgency = 'caution';

  // Progress bar width
  const progressWidth = totalSeconds ? (remainingSeconds / totalSeconds) * 100 : 100;

  return (
    <div className={`duel-timer ${urgency}`}>
      <div className="timer-progress-bar">
        <div
          className="timer-progress-fill"
          style={{ width: `${progressWidth}%` }}
        ></div>
      </div>
      <span className="timer-display">{formatted}</span>
    </div>
  );
}
