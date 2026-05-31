import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { getLeaderboard, getMyStats } from '../../services/duelService';
import MatchmakingModal from './MatchmakingModal';

const FORMATS = [
  { value: '1q', label: '1 Question (10 mins)', icon: '⚡' },
  { value: '3q', label: '3 Questions (30 mins)', icon: '🔥' },
];

export default function ArenaLobby() {
  const navigate = useNavigate();
  const {
    isConnected,
    isSearching,
    queueStats,
    matchFound,
    joinQueue,
    leaveQueue,
    error: wsError,
  } = useMatchmaking();

  const [selectedFormat, setSelectedFormat] = useState('1q');
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Load user stats and leaderboard
  useEffect(() => {
    getMyStats().then(setStats).catch(() => {});
    getLeaderboard(10).then((data) => setLeaderboard(data.players || [])).catch(() => {});
  }, []);

  // Handle match found — redirect to duel
  useEffect(() => {
    if (matchFound && matchFound.mode.startsWith('duel') && matchFound.duelId) {
      setShowModal(false);
      navigate(`/duel/${matchFound.duelId}`);
    }
  }, [matchFound, navigate]);

  const handleFindMatch = () => {
    setShowModal(true);
    joinQueue(`duel-${selectedFormat}`, 'agnostic'); // Language is now agnostic, passed format in mode
  };

  const handleCancelSearch = () => {
    leaveQueue();
    setShowModal(false);
  };

  return (
    <div className="arena-lobby-page blood-theme">
      {/* Header */}
      <header className="arena-header">
        <div className="arena-header-content">
          <button className="arena-back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to HQ
          </button>
          <h1 className="arena-title">
            <span className="arena-title-icon">⚔️</span>
            THE ARENA
          </h1>
          {stats && (
            <div className="arena-user-stats">
              <span className="arena-rank-badge">{stats.tier?.badge}</span>
              <span className="arena-elo">{stats.elo} ELO</span>
              <span className="arena-win-rate">{stats.winRate}% WR</span>
            </div>
          )}
        </div>
      </header>

      <main className="arena-main">
        {/* Connection Status */}
        <div className={`arena-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {isConnected ? 'Matchmaking Server Online' : 'Establishing Connection...'}
        </div>

        {/* Action Center */}
        <section className="arena-section main-action">
          <div className="arena-mode-display">
            <div className="mode-icon-large">⚔️</div>
            <h2>Ranked Duel</h2>
            <p>Enter the bloodbath. 1v1 competitive coding. Winner takes all.</p>
            <div className="arena-queue-info">
              <span className="queue-pulse"></span>
              {queueStats.duel} warriors in queue
            </div>
          </div>
        </section>

        {/* Format Selection */}
        <section className="arena-section">
          <h2 className="arena-section-title">Match Format</h2>
          <div className="arena-language-grid">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                className={`arena-lang-chip ${selectedFormat === fmt.value ? 'selected' : ''}`}
                onClick={() => setSelectedFormat(fmt.value)}
              >
                <span className="lang-chip-icon">{fmt.icon}</span>
                {fmt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Find Match Button */}
        <section className="arena-section action-section">
          <button
            className="arena-find-btn"
            onClick={handleFindMatch}
            disabled={!isConnected || isSearching}
          >
            {isSearching ? 'SEARCHING...' : 'ENTER MATCHMAKING'}
          </button>
          {wsError && <p className="arena-error">{wsError}</p>}
        </section>

        {/* Leaderboard */}
        <section className="arena-section">
          <h2 className="arena-section-title">Wall of Legends</h2>
          {leaderboard.length > 0 ? (
            <div className="arena-leaderboard">
              {leaderboard.map((player, i) => (
                <div
                  key={player.id}
                  className={`arena-leaderboard-row ${i < 3 ? `top-${i + 1}` : ''}`}
                  onClick={() => navigate(`/profile/${player.id}`)}
                >
                  <span className="lb-rank">#{i + 1}</span>
                  <span className="lb-badge">{player.tier?.badge}</span>
                  <span className="lb-username">{player.username}</span>
                  <span className="lb-elo">{player.elo_rating}</span>
                  <span className="lb-winrate">{player.winRate}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="arena-empty">
              <p>The wall is blank. Claim your spot.</p>
            </div>
          )}
        </section>
      </main>

      {/* Matchmaking Modal */}
      {showModal && (
        <MatchmakingModal
          mode={`duel-${selectedFormat}`}
          language="Agnostic"
          queueStats={queueStats}
          onCancel={handleCancelSearch}
          isBloodTheme={true}
        />
      )}
    </div>
  );
}
