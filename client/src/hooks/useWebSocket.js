import { useEffect, useState, useCallback, useRef } from 'react';
import wsService from '../services/wsService';

/**
 * Custom hook for general WebSocket communication.
 */
export function useWebSocket(token) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const cleanupRef = useRef([]);

  useEffect(() => {
    if (!token) return;

    wsService.connect(token);

    const unsubs = [];

    unsubs.push(
      wsService.on('connected', () => setConnected(true))
    );
    unsubs.push(
      wsService.on('disconnected', () => setConnected(false))
    );
    unsubs.push(
      wsService.on('message', (data) => setLastMessage(data))
    );

    cleanupRef.current = unsubs;

    return () => {
      unsubs.forEach((unsub) => unsub && unsub());
      wsService.disconnect();
    };
  }, [token]);

  const sendMessage = useCallback((event, data) => {
    return wsService.send(event, data);
  }, []);

  const subscribe = useCallback((event, callback) => {
    return wsService.on(event, callback);
  }, []);

  return {
    connected,
    sendMessage,
    lastMessage,
    subscribe,
  };
}

export default useWebSocket;
