import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import MatchmakingModal from './MatchmakingModal';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', icon: '🟨' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'cpp', label: 'C++', icon: '⚙️' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'go', label: 'Go', icon: '🐹' },
  { value: 'c', label: 'C', icon: '🔧' },
];

export default function CollabLobby() {
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

  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [showModal, setShowModal] = useState(false);

  // Handle match found — redirect to collab room
  useEffect(() => {
    if (matchFound && matchFound.mode === 'collab' && matchFound.roomId) {
      setShowModal(false);
      navigate(`/editor/${matchFound.roomId}`);
    }
  }, [matchFound, navigate]);

  const handleFindMatch = () => {
    setShowModal(true);
    joinQueue('collab', selectedLanguage);
  };

  const handleCancelSearch = () => {
    leaveQueue();
    setShowModal(false);
  };

  return (
    <div className="lobby-page collab-theme">
      {/* Header */}
      <header className="lobby-header">
        <div className="lobby-header-content">
          <button className="lobby-back-btn" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <h1 className="lobby-title">
            <span className="lobby-title-icon">🤝</span>
            Quick Match
          </h1>
        </div>
      </header>

      <main className="lobby-main">
        {/* Connection Status */}
        <div className={`lobby-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {isConnected ? 'Connected to matching server' : 'Connecting...'}
        </div>

        {/* Action Center */}
        <section className="lobby-section">
          <div className="mode-card selected" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div className="mode-card-icon" style={{ fontSize: '4rem' }}>🤝</div>
            <h3>Collaborative Coding</h3>
            <p>Pair program with a stranger. Learn, build, and solve problems together.</p>
            <div className="mode-card-info" style={{ justifyContent: 'center', marginTop: '1rem' }}>
              <span className="mode-queue-count">{queueStats.collab} developers looking to pair</span>
            </div>
          </div>
        </section>

        {/* Language Selection */}
        <section className="lobby-section" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <h2 className="lobby-section-title">Select Language</h2>
          <div className="lobby-language-grid">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                className={`lang-chip ${selectedLanguage === lang.value ? 'selected' : ''}`}
                onClick={() => setSelectedLanguage(lang.value)}
              >
                <span className="lang-chip-icon">{lang.icon}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </section>

        {/* Find Match Button */}
        <section className="lobby-section lobby-action-section">
          <button
            className="lobby-find-btn"
            onClick={handleFindMatch}
            disabled={!isConnected || isSearching}
          >
            <span className="btn-icon">🤝</span>
            Find Partner
          </button>
          {wsError && <p className="lobby-error">{wsError}</p>}
        </section>
      </main>

      {/* Matchmaking Modal */}
      {showModal && (
        <MatchmakingModal
          mode="collab"
          language={selectedLanguage}
          queueStats={queueStats}
          onCancel={handleCancelSearch}
          isBloodTheme={false}
        />
      )}
    </div>
  );
}
