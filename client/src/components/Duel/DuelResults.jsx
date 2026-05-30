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
        <div className="results-players stacked">
          {/* Top Card: Winner (or Me if draw) */}
          <div className={`results-player-card ${isDraw ? '' : 'winner'}`}>
            <div className="player-card-header">
              <span className="player-card-label">{iWon || isDraw ? 'You' : 'Opponent'}</span>
              {!isDraw && <span className="winner-crown">👑</span>}
            </div>
            <h3 className="player-card-name">{iWon || isDraw ? me.username : opponent.username}</h3>
            <div className="player-card-score">
              {iWon || isDraw ? me.testsPassed : opponent.testsPassed}/{iWon || isDraw ? me.totalTests : opponent.totalTests} tests
            </div>

            <div className="player-card-elo">
              <div className="elo-change-row">
                <span className="elo-old">{iWon || isDraw ? me.oldElo : opponent.oldElo}</span>
                <span className="elo-arrow">→</span>
                <span className="elo-new">{iWon || isDraw ? me.newElo : opponent.newElo}</span>
              </div>
              <span className={`elo-delta ${(iWon || isDraw ? me.eloChange : opponent.eloChange) >= 0 ? 'positive' : 'negative'}`}>
                {(iWon || isDraw ? me.eloChange : opponent.eloChange) >= 0 ? '+' : ''}{iWon || isDraw ? me.eloChange : opponent.eloChange}
              </span>
            </div>

            <div className="player-card-rank">
              <span className="rank-badge">{iWon || isDraw ? me.newRank?.badge : opponent.newRank?.badge}</span>
              <span className="rank-name">{iWon || isDraw ? me.newRank?.name : opponent.newRank?.name}</span>
            </div>
          </div>

          <div className="results-vs-vertical">VS</div>

          {/* Bottom Card: Loser (or Opponent if draw) */}
          <div className={`results-player-card ${isDraw ? '' : 'loser'}`}>
            <div className="player-card-header">
              <span className="player-card-label">{iWon || isDraw ? 'Opponent' : 'You'}</span>
            </div>
            <h3
              className="player-card-name clickable"
              onClick={() => onViewProfile?.(iWon || isDraw ? opponent.userId : me.userId)}
            >
              {iWon || isDraw ? opponent.username : me.username}
            </h3>
            <div className="player-card-score">
              {iWon || isDraw ? opponent.testsPassed : me.testsPassed}/{iWon || isDraw ? opponent.totalTests : me.totalTests} tests
            </div>

            <div className="player-card-elo">
              <div className="elo-change-row">
                <span className="elo-old">{iWon || isDraw ? opponent.oldElo : me.oldElo}</span>
                <span className="elo-arrow">→</span>
                <span className="elo-new">{iWon || isDraw ? opponent.newElo : me.newElo}</span>
              </div>
              <span className={`elo-delta ${(iWon || isDraw ? opponent.eloChange : me.eloChange) >= 0 ? 'positive' : 'negative'}`}>
                {(iWon || isDraw ? opponent.eloChange : me.eloChange) >= 0 ? '+' : ''}{iWon || isDraw ? opponent.eloChange : me.eloChange}
              </span>
            </div>

            <div className="player-card-rank">
              <span className="rank-badge">{iWon || isDraw ? opponent.newRank?.badge : me.newRank?.badge}</span>
              <span className="rank-name">{iWon || isDraw ? opponent.newRank?.name : me.newRank?.name}</span>
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
