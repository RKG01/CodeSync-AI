import React, { useState, useEffect } from 'react';

export default function MatchmakingModal({ mode, language, queueStats, onCancel }) {
  const [elapsed, setElapsed] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(dotInterval);
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="matchmaking-overlay">
      <div className="matchmaking-modal">
        {/* Animated search ring */}
        <div className="matchmaking-animation">
          <div className="search-ring ring-1"></div>
          <div className="search-ring ring-2"></div>
          <div className="search-ring ring-3"></div>
          <div className="search-center">
            <span className="search-icon">{mode.startsWith('duel') ? '⚔️' : '🤝'}</span>
          </div>
        </div>

        <h2 className="matchmaking-title">
          {mode.startsWith('duel') ? 'Finding Opponent' : 'Finding Partner'}{dots}
        </h2>

        <div className="matchmaking-info">
          <div className="matchmaking-detail">
            <span className="detail-label">Mode</span>
            <span className="detail-value">{mode.startsWith('duel') ? '⚔️ Duel' : '🤝 Collab'}</span>
          </div>
          <div className="matchmaking-detail">
            <span className="detail-label">Language</span>
            <span className="detail-value">{language}</span>
          </div>
          <div className="matchmaking-detail">
            <span className="detail-label">In Queue</span>
            <span className="detail-value">{mode.startsWith('duel') ? queueStats.duel : queueStats.collab}</span>
          </div>
          <div className="matchmaking-detail">
            <span className="detail-label">Time</span>
            <span className="detail-value timer">{formatTime(elapsed)}</span>
          </div>
        </div>

        <p className="matchmaking-hint">
          {elapsed > 30
            ? 'Taking a while... expanding search range'
            : 'Matching you with a similar skill level player'}
        </p>

        <button className="matchmaking-cancel-btn" onClick={onCancel}>
          Cancel Search
        </button>
      </div>
    </div>
  );
}
