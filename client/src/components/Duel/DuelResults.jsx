import React from 'react';

export default function DuelResults({ result, userId, onBackToLobby, onViewProfile }) {
  if (!result) return null;

  const isPlayer1 = result.player1.userId === userId;
  const me = isPlayer1 ? result.player1 : result.player2;
  const opponent = isPlayer1 ? result.player2 : result.player1;
  const iWon = result.winnerId === userId;
  const isDraw = result.isDraw;

  return (
    <div className="duel-results-overlay">
      <div className="duel-results-modal">
        {/* Result Banner */}
        <div className={`results-banner ${iWon ? 'victory' : isDraw ? 'draw' : 'defeat'}`}>
          <div className="results-banner-icon">
            {iWon ? '🏆' : isDraw ? '🤝' : '💀'}
          </div>
          <h1 className="results-banner-text">
            {iWon ? 'VICTORY!' : isDraw ? 'DRAW!' : 'DEFEAT'}
          </h1>
        </div>

        {/* Player Cards */}
        <div className="results-players">
          {/* Me */}
          <div className={`results-player-card ${iWon ? 'winner' : isDraw ? '' : 'loser'}`}>
            <div className="player-card-header">
              <span className="player-card-label">You</span>
              {iWon && <span className="winner-crown">👑</span>}
            </div>
            <h3 className="player-card-name">{me.username}</h3>
            <div className="player-card-score">
              {me.testsPassed}/{me.totalTests} tests
            </div>

            <div className="player-card-elo">
              <div className="elo-change-row">
                <span className="elo-old">{me.oldElo}</span>
                <span className="elo-arrow">→</span>
                <span className="elo-new">{me.newElo}</span>
              </div>
              <span className={`elo-delta ${me.eloChange >= 0 ? 'positive' : 'negative'}`}>
                {me.eloChange >= 0 ? '+' : ''}{me.eloChange}
              </span>
            </div>

            <div className="player-card-rank">
              <span className="rank-badge">{me.newRank?.badge}</span>
              <span className="rank-name">{me.newRank?.name}</span>
            </div>
          </div>

          {/* VS Separator */}
          <div className="results-vs">VS</div>

          {/* Opponent */}
          <div className={`results-player-card ${!iWon && !isDraw ? 'winner' : iWon ? 'loser' : ''}`}>
            <div className="player-card-header">
              <span className="player-card-label">Opponent</span>
              {!iWon && !isDraw && <span className="winner-crown">👑</span>}
            </div>
            <h3
              className="player-card-name clickable"
              onClick={() => onViewProfile?.(opponent.userId)}
            >
              {opponent.username}
            </h3>
            <div className="player-card-score">
              {opponent.testsPassed}/{opponent.totalTests} tests
            </div>

            <div className="player-card-elo">
              <div className="elo-change-row">
                <span className="elo-old">{opponent.oldElo}</span>
                <span className="elo-arrow">→</span>
                <span className="elo-new">{opponent.newElo}</span>
              </div>
              <span className={`elo-delta ${opponent.eloChange >= 0 ? 'positive' : 'negative'}`}>
                {opponent.eloChange >= 0 ? '+' : ''}{opponent.eloChange}
              </span>
            </div>

            <div className="player-card-rank">
              <span className="rank-badge">{opponent.newRank?.badge}</span>
              <span className="rank-name">{opponent.newRank?.name}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="results-actions">
          <button className="results-action-btn primary" onClick={onBackToLobby}>
            ⚔️ Find Another Match
          </button>
          <button
            className="results-action-btn secondary"
            onClick={() => onViewProfile?.(opponent.userId)}
          >
            👤 View Opponent Profile
          </button>
        </div>
      </div>
    </div>
  );
}
