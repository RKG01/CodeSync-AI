/**
 * @module hooks/useMatchmaking
 * @description React hook for managing the matchmaking WebSocket connection.
 * Handles joining/leaving queues and receiving match-found events.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

const WS_BASE = import.meta.env.VITE_WS_URL || `ws://localhost:4000`;

/**
 * @returns {{ 
 *   isConnected: boolean,
 *   isSearching: boolean,
 *   queueStats: { collab: number, duel: number },
 *   matchFound: Object|null,
 *   joinQueue: (mode: string, language: string) => void,
 *   leaveQueue: () => void,
 *   error: string|null
 * }}
 */
export function useMatchmaking() {
  const { token } = useAuth();
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [queueStats, setQueueStats] = useState({ collab: 0, duel: 0 });
  const [matchFound, setMatchFound] = useState(null);
  const [error, setError] = useState(null);

  // Connect to matchmaking WebSocket
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/matchmaking?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        switch (payload.type) {
          case 'queue:stats':
            setQueueStats(payload.data);
            break;
          case 'queue:joined':
            setIsSearching(true);
            break;
          case 'queue:left':
            setIsSearching(false);
            break;
          case 'match:found':
            setIsSearching(false);
            setMatchFound(payload.data);
            break;
          case 'queue:error':
            setError(payload.data.message);
            break;
        }
      } catch (err) {
        console.error('Matchmaking WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsSearching(false);
    };

    ws.onerror = () => {
      setError('Connection lost. Please try again.');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token]);

  const joinQueue = useCallback((mode, language) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setMatchFound(null);
      setError(null);
      wsRef.current.send(JSON.stringify({
        type: 'queue:join',
        data: { mode, language },
      }));
    }
  }, []);

  const leaveQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'queue:leave' }));
      setIsSearching(false);
    }
  }, []);

  return {
    isConnected,
    isSearching,
    queueStats,
    matchFound,
    joinQueue,
    leaveQueue,
    error,
  };
}

export default useMatchmaking;
