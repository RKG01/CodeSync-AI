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
    problem,
    starterCode,
    visibleTestCases,
    totalTestCases,
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

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('problem'); // 'problem' | 'results'
  const editorRef = useRef(null);

  // Set initial code from starter
  useEffect(() => {
    if (starterCode && !code) {
      setCode(starterCode);
    }
  }, [starterCode]);

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
    if (!code.trim() || isSubmitting || isRunning) return;
    setIsSubmitting(true);
    submitCode(code);
  }, [code, isSubmitting, isRunning, submitCode]);

  const handleRun = useCallback(() => {
    if (!code.trim() || isSubmitting || isRunning) return;
    setIsRunning(true);
    runCode(code);
  }, [code, isSubmitting, isRunning, runCode]);

  const handleForfeit = useCallback(() => {
    if (window.confirm('Are you sure you want to forfeit? Your opponent will win.')) {
      forfeit();
    }
  }, [forfeit]);

  const monacoLanguage = LANGUAGE_MAP[duelState?.language] || 'javascript';

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
  if (!problem && !duelResult) {
    return (
      <div className="duel-loading">
        <div className="duel-loading-spinner"></div>
        <h2>Preparing your duel...</h2>
        <p>Generating a challenge{duelState?.language ? ` in ${duelState.language}` : ''}...</p>
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
          <span className="duel-badge">⚔️ DUEL</span>
          <span className="duel-language-badge">{duelState?.language}</span>
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
              <ProblemPanel
                problem={problem}
                visibleTestCases={visibleTestCases}
                totalTestCases={totalTestCases}
              />
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
                disabled={isSubmitting || isRunning || !code.trim()}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: (isSubmitting || isRunning || !code.trim()) ? 'not-allowed' : 'pointer',
                  marginRight: '8px'
                }}
              >
                {isRunning ? '⏳ Running...' : '▶ Run Code'}
              </button>
              <button
                className="duel-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || isRunning || !code.trim()}
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
              value={code}
              onChange={(value) => setCode(value || '')}
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
