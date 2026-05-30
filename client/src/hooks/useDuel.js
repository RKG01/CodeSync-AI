/**
 * @module hooks/useDuel
 * @description React hook for managing an active duel WebSocket connection.
 * Handles receiving problem data, submitting code, and tracking duel state.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

const WS_BASE = import.meta.env.VITE_WS_URL || `ws://localhost:4000`;

/**
 * @param {string} duelId - The duel to connect to.
 * @returns {{
 *   isConnected: boolean,
 *   duelState: Object|null,
 *   countdown: number|null,
 *   problem: Object|null,
 *   starterCode: string,
 *   remainingTime: number|null,
 *   submissionResult: Object|null,
 *   opponentProgress: Object|null,
 *   duelResult: Object|null,
 *   opponentDisconnected: boolean,
 *   submitCode: (code: string) => void,
 *   forfeit: () => void,
 *   error: string|null
 * }}
 */
export function useDuel(duelId) {
  const { token } = useAuth();
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [duelState, setDuelState] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [problem, setProblem] = useState(null);
  const [starterCode, setStarterCode] = useState('');
  const [visibleTestCases, setVisibleTestCases] = useState([]);
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [duration, setDuration] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [opponentProgress, setOpponentProgress] = useState(null);
  const [duelResult, setDuelResult] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!duelId || !token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/duel/${duelId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        switch (payload.type) {
          case 'duel:state':
            setDuelState(payload.data);
            break;

          case 'duel:countdown':
            setCountdown(payload.data.seconds);
            break;

          case 'duel:start':
            setCountdown(null);
            setProblem(payload.data.problem);
            setStarterCode(payload.data.starterCode);
            setVisibleTestCases(payload.data.visibleTestCases || []);
            setTotalTestCases(payload.data.totalTestCases || 0);
            setDuration(payload.data.duration);
            setRemainingTime(payload.data.duration);
            break;

          case 'duel:timer':
            setRemainingTime(payload.data.remainingSeconds);
            break;

          case 'duel:submission_result':
            setSubmissionResult(payload.data);
            break;

          case 'duel:opponent_progress':
            setOpponentProgress(payload.data);
            break;

          case 'duel:complete':
            setDuelResult(payload.data);
            setRemainingTime(0);
            break;

          case 'duel:opponent_disconnected':
            setOpponentDisconnected(true);
            break;

          case 'duel:error':
            setError(payload.data.message);
            break;
        }
      } catch (err) {
        console.error('Duel WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setError('Duel connection lost.');
    };

    // Local countdown timer
    const timerInterval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerInterval);
      ws.close();
      wsRef.current = null;
    };
  }, [duelId, token]);

  const submitCode = useCallback((code) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setSubmissionResult(null); // Clear previous result
      wsRef.current.send(JSON.stringify({
        type: 'duel:submit',
        data: { code },
      }));
    }
  }, []);

  const forfeit = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'duel:forfeit' }));
    }
  }, []);

  return {
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
    opponentProgress,
    duelResult,
    opponentDisconnected,
    submitCode,
    forfeit,
    error,
  };
}

export default useDuel;
