import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDuel } from '../../hooks/useDuel';
import { useAuth } from '../../hooks/useAuth';
import useVoiceChat from '../../hooks/useVoiceChat';
import ProblemPanel from './ProblemPanel';
import DuelTimer from './DuelTimer';
import DuelResults from './DuelResults';
import TestResultsPanel from './TestResultsPanel';
import Editor from '@monaco-editor/react';
import { getGenericStarterCode } from '../../utils/starterCode';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'go', label: 'Go' },
  { value: 'c', label: 'C' },
];

const LANGUAGE_MAP = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  c: 'c',
  typescript: 'typescript',
  go: 'go',
};

export default function DuelArena() {
  const { duelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isConnected,
    duelState,
    countdown,
    problems,
    duration,
    remainingTime,
    submissionResult,
    runResult,
    opponentProgress,
    duelResult,
    opponentDisconnected,
    submitCode,
    runCode,
    forfeit,
    error,
    wsRef,
  } = useDuel(duelId);

  // Voice chat
  const voiceChat = useVoiceChat(wsRef?.current, user?.id);

  const [language, setLanguage] = useState('javascript');
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [codes, setCodes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('problem'); // 'problem' | 'results'
  const editorRef = useRef(null);

  // Load from local storage on mount
  useEffect(() => {
    if (!duelId) return;
    const saved = localStorage.getItem(`codesync-duel-${duelId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.codes) {
          // Check for backwards compatibility
          const isOldFormat = Object.values(parsed.codes).some(val => typeof val === 'string');
          if (isOldFormat) {
            const migrated = {};
            for (const key in parsed.codes) {
              migrated[key] = { [parsed.language || 'javascript']: parsed.codes[key] };
            }
            setCodes(migrated);
          } else {
            setCodes(parsed.codes);
          }
        }
        if (parsed.language) setLanguage(parsed.language);
      } catch (e) {
        console.error('Failed to parse saved code:', e);
      }
    }
  }, [duelId]);

  // Save to local storage on change
  useEffect(() => {
    if (!duelId) return;
    localStorage.setItem(`codesync-duel-${duelId}`, JSON.stringify({ codes, language }));
  }, [codes, language, duelId]);

  // Populate starter code if empty when problems arrive or language changes
  useEffect(() => {
    if (problems && problems.length > 0) {
      setCodes(prev => {
        const next = { ...prev };
        let changed = false;
        
        // List of all possible default templates to check if the user hasn't edited them
        const allTemplates = LANGUAGES.map(l => getGenericStarterCode(l.value));

        for (let i = 0; i < problems.length; i++) {
          if (!next[i]) next[i] = {};
          if (next[i][language] === undefined || allTemplates.includes(next[i][language])) {
            if (language === 'javascript' && problems[i].starterCode) {
              next[i][language] = problems[i].starterCode;
            } else {
              next[i][language] = getGenericStarterCode(language);
            }
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [problems, language]);

  const handleCodeChange = (value) => {
    setCodes(prev => ({
      ...prev,
      [currentProblemIndex]: {
        ...(prev[currentProblemIndex] || {}),
        [language]: value || ''
      }
    }));
  };

  // Reset submitting/running state when we get a result
  useEffect(() => {
    if (submissionResult) {
      setIsSubmitting(false);
      setActiveTab('results');
    }
  }, [submissionResult]);

  useEffect(() => {
    if (runResult) {
      setIsRunning(false);
      setActiveTab('results');
    }
  }, [runResult]);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const currentCode = codes[currentProblemIndex]?.[language] || '';
    if (!currentCode.trim() || isSubmitting || isRunning) return;
    setIsSubmitting(true);
    submitCode(currentCode, language, currentProblemIndex);
  }, [codes, currentProblemIndex, language, isSubmitting, isRunning, submitCode]);

  const handleRun = useCallback(() => {
    const currentCode = codes[currentProblemIndex]?.[language] || '';
    if (!currentCode.trim() || isSubmitting || isRunning) return;
    setIsRunning(true);
    runCode(currentCode, language, currentProblemIndex);
  }, [codes, currentProblemIndex, language, isSubmitting, isRunning, runCode]);

  const handleForfeit = useCallback(() => {
    if (window.confirm('Are you sure you want to forfeit? Your opponent will win.')) {
      forfeit();
    }
  }, [forfeit]);

  const monacoLanguage = LANGUAGE_MAP[language] || 'javascript';

  // Determine which player we are and who the opponent is
  const isPlayer1 = duelState?.player1?.userId === user?.id;
  const myInfo = isPlayer1 ? duelState?.player1 : duelState?.player2;
  const opponentInfo = isPlayer1 ? duelState?.player2 : duelState?.player1;

  // Countdown overlay
  if (countdown !== null && countdown > 0) {
    return (
      <div className="duel-countdown-overlay">
        <div className="countdown-content-formal">
          <div className="countdown-banner">MATCH COMMENCING</div>
          <div className="countdown-cards">
            <div className="countdown-player-card">
              <div className="cp-avatar"></div>
              <div className="cp-info">
                <span className="cp-username">{myInfo?.username || 'You'}</span>
                <span className="cp-elo">{myInfo?.elo || '?'} Rating</span>
              </div>
            </div>
            <div className="countdown-vs-divider">
              <span>VS</span>
            </div>
            <div className="countdown-player-card opponent-card">
              <div className="cp-avatar opponent-avatar"></div>
              <div className="cp-info">
                <span className="cp-username">{opponentInfo?.username || 'Opponent'}</span>
                <span className="cp-elo">{opponentInfo?.elo || '?'} Rating</span>
              </div>
            </div>
          </div>
          <div className="countdown-number-pulsing">{countdown}</div>
        </div>
      </div>
    );
  }

  // Loading state
  if ((!problems || problems.length === 0) && !duelResult) {
    return (
      <div className="duel-loading">
        <div className="duel-loading-spinner"></div>
        <h2>Preparing your duel...</h2>
        <p>Waiting for the arena to open...</p>
        {error && <p className="duel-error">{error}</p>}
      </div>
    );
  }

  // Results overlay
  if (duelResult) {
    return (
      <DuelResults
        result={duelResult}
        userId={user?.id}
        onBackToLobby={() => navigate('/lobby')}
        onViewProfile={(uid) => navigate(`/profile/${uid}`)}
      />
    );
  }

  return (
    <div className="duel-arena">
      {/* Top Bar */}
      <header className="duel-header">
        <div className="duel-header-left">
          <span className="duel-badge">⚔️ {duelState?.formatMode === 'duel-3q' ? '3-Q MATCH' : '1-Q MATCH'}</span>
          <select
            className="duel-language-select"
            value={language}
            onChange={(e) => {
              // Warn if changing language might reset things
              if (window.confirm("Changing language will only reset unedited default templates. Proceed?")) {
                setLanguage(e.target.value);
              }
            }}
            style={{ marginLeft: '12px', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>

        <DuelTimer
          remainingSeconds={remainingTime}
          totalSeconds={duration}
        />

        <div className="duel-header-right">
          {/* Opponent Progress */}
          <div className="duel-opponent-status">
            <span className="opponent-label">👤 {opponentInfo?.username}</span>
            {opponentProgress && (
              <span className="opponent-score">
                {opponentProgress.testsPassed}/{opponentProgress.totalTests} passed
              </span>
            )}
          </div>
          {/* Voice Chat Controls */}
          <div className="voice-chat-controls">
            <button
              className={`voice-btn ${voiceChat.isActive ? (voiceChat.isMicMuted ? 'muted' : 'active') : ''} ${voiceChat.connectionState === 'connecting' ? 'connecting' : ''}`}
              onClick={voiceChat.isActive ? voiceChat.toggleMic : voiceChat.toggleVoice}
              title={voiceChat.isActive ? (voiceChat.isMicMuted ? 'Unmute Mic' : 'Mute Mic') : 'Start Voice Chat'}
            >
              {voiceChat.isActive ? (voiceChat.isMicMuted ? '🔇' : '🎤') : '🎤'}
              {voiceChat.isActive && <span className={`voice-status-dot ${voiceChat.connectionState}`} />}
            </button>
            {voiceChat.isActive && (
              <button
                className={`voice-btn ${voiceChat.isRemoteMuted ? 'muted' : ''}`}
                onClick={voiceChat.toggleRemoteMute}
                title={voiceChat.isRemoteMuted ? 'Unmute Opponent' : 'Mute Opponent'}
              >
                {voiceChat.isRemoteMuted ? '🔇' : '🔊'}
              </button>
            )}
            {voiceChat.isActive && (
              <button
                className="voice-btn muted"
                onClick={voiceChat.toggleVoice}
                title="Disconnect Voice"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="duel-body">
        {/* Left Panel — Problem + Test Results */}
        <div className="duel-left-panel">
          <div className="duel-panel-tabs">
            <button
              className={`panel-tab ${activeTab === 'problem' ? 'active' : ''}`}
              onClick={() => setActiveTab('problem')}
            >
              📋 Problem
            </button>
            <button
              className={`panel-tab ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              ✅ Results
              {(submissionResult || runResult) && (
                <span className="tab-badge">
                  {(submissionResult || runResult).testsPassed}/{(submissionResult || runResult).totalTests}
                </span>
              )}
            </button>
          </div>

          <div className="duel-panel-content">
            {activeTab === 'problem' ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {problems && problems.length > 1 && (
                  <div className="problem-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
                    {problems.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentProblemIndex(idx)}
                        style={{
                          padding: '8px 16px',
                          background: currentProblemIndex === idx ? 'var(--accent-primary)' : 'transparent',
                          color: currentProblemIndex === idx ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        Q{idx + 1}
                      </button>
                    ))}
                  </div>
                )}
                {problems && problems[currentProblemIndex] && (
                  <ProblemPanel
                    problem={problems[currentProblemIndex]}
                    visibleTestCases={problems[currentProblemIndex].visibleTestCases || []}
                    totalTestCases={problems[currentProblemIndex].totalTestCases || 0}
                  />
                )}
              </div>
            ) : (
              <TestResultsPanel result={submissionResult || runResult} />
            )}
          </div>
        </div>

        {/* Right Panel — Code Editor */}
        <div className="duel-right-panel">
          <div className="duel-editor-header">
            <span>Solution</span>
            <div className="duel-editor-actions">
              <button
                className="duel-run-btn"
                onClick={handleRun}
                disabled={isSubmitting || isRunning || !(codes[currentProblemIndex]?.[language] || '').trim()}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: (isSubmitting || isRunning || !(codes[currentProblemIndex]?.[language] || '').trim()) ? 'not-allowed' : 'pointer',
                  marginRight: '8px'
                }}
              >
                {isRunning ? '⏳ Running...' : '▶ Run Code'}
              </button>
              <button
                className="duel-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || isRunning || !(codes[currentProblemIndex]?.[language] || '').trim()}
              >
                {isSubmitting ? '⏳ Submitting...' : '🚀 Submit'}
              </button>
              <button className="duel-forfeit-btn" onClick={handleForfeit}>
                🏳️ Forfeit
              </button>
            </div>
          </div>

          <div className="duel-editor-container">
            <Editor
              height="100%"
              language={monacoLanguage}
              value={codes[currentProblemIndex]?.[language] || ''}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
            />
          </div>
        </div>
      </div>

      {/* Opponent Disconnected Banner */}
      {opponentDisconnected && (
        <div className="duel-disconnect-banner">
          ⚡ Your opponent has disconnected. You win by forfeit!
        </div>
      )}
    </div>
  );
}
