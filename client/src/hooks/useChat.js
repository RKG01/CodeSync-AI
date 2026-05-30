/**
 * @module hooks/useChat
 * @description Dedicated chat hook that connects directly to the chat WebSocket endpoint.
 * The server expects connections at /ws/chat/:projectId and messages with types:
 *   - chat:send (client -> server)
 *   - chat:message (server -> client broadcast)
 *   - chat:typing (bidirectional)
 *   - chat:history (server -> client on connect)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';

export function useChat(projectId) {
  const { user, token } = useAuth();
  const wsRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const reconnectRef = useRef(null);
  const intentionalCloseRef = useRef(false);

  useEffect(() => {
    if (!token || !projectId) return;

    intentionalCloseRef.current = false;

    function connect() {
      const url = `${WS_BASE}/ws/chat/${projectId}?token=${encodeURIComponent(token)}`;
      console.log(`[Chat] Connecting to ${url}`);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Chat] Connected');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          switch (payload.type) {
            case 'chat:history': {
              // Server sends chat history on connect
              const history = (payload.data?.messages || []).map((m) => ({
                id: m.id,
                user: { name: m.username, _id: m.user_id },
                text: m.content,
                timestamp: m.created_at,
                isMine: m.user_id === user?.id || m.user_id === user?._id,
              }));
              setMessages(history);
              break;
            }
            case 'chat:message': {
              const d = payload.data;
              const isMine = d.userId === user?.id || d.userId === user?._id;
              setMessages((prev) => [
                ...prev,
                {
                  id: d.id || Date.now(),
                  user: { name: d.username, _id: d.userId },
                  text: d.content,
                  timestamp: d.timestamp,
                  isMine,
                },
              ]);
              break;
            }
            case 'chat:typing': {
              const d = payload.data;
              if (d.userId !== user?.id && d.userId !== user?._id) {
                setTypingUsers((prev) => {
                  const exists = prev.find((u) => u.id === d.userId);
                  if (!exists) return [...prev, { id: d.userId, name: d.username }];
                  return prev;
                });
                setTimeout(() => {
                  setTypingUsers((prev) => prev.filter((u) => u.id !== d.userId));
                }, 3000);
              }
              break;
            }
            case 'chat:user_joined':
            case 'chat:user_left':
              // Could show system messages here
              break;
            case 'chat:error':
              console.error('[Chat] Server error:', payload.data?.message);
              break;
          }
        } catch (err) {
          console.error('[Chat] Parse error:', err);
        }
      };

      ws.onclose = () => {
        console.log('[Chat] Disconnected');
        setConnected(false);
        wsRef.current = null;
        if (!intentionalCloseRef.current) {
          reconnectRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = (err) => {
        console.error('[Chat] WebSocket error:', err);
      };
    }

    connect();

    return () => {
      intentionalCloseRef.current = true;
      clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
    };
  }, [token, projectId, user?.id, user?._id]);

  const sendChatMessage = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'chat:send',
      data: { content: text },
    }));
  }, []);

  const sendTyping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'chat:typing',
      data: { isTyping: true },
    }));
  }, []);

  return {
    messages,
    connected,
    typingUsers,
    sendChatMessage,
    sendTyping,
  };
}

export default useChat;
