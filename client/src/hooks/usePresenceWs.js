import { useState, useEffect, useRef } from 'react';

const WS_BASE = import.meta.env.VITE_WS_URL || `ws://localhost:4000`;

/**
 * Hook to create a dedicated presence WebSocket connection for a project.
 * Used by voice chat to send/receive WebRTC signaling through the presence WS.
 * 
 * @param {string} projectId - The project ID to join.
 * @param {string} token - The JWT auth token.
 * @returns {{ ws: WebSocket|null, connected: boolean }}
 */
export default function usePresenceWs(projectId, token) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!projectId || !token) return;

    const url = `${WS_BASE}/ws/presence/${projectId}?token=${token}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [projectId, token]);

  return { ws: wsRef.current, connected };
}
