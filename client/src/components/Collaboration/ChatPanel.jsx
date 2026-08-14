import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInitials, generateUserColor, formatTime } from '../../utils/helpers';

export default function ChatPanel({ projectId, onClose }) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Import and use the dedicated chat hook
  const [chatState, setChatState] = useState({
    messages: [],
    connected: false,
    typingUsers: [],
    sendChatMessage: () => {},
    sendTyping: () => {},
  });

  // Dynamically import useChat to avoid circular deps
  const chatRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    import('../../hooks/useChat.js').then((mod) => {
      if (!cancelled) {
        chatRef.current = mod;
      }
    });

    return () => { cancelled = true; };
  }, [projectId]);

  // We need a component that uses the hook inside the render tree
  // Since hooks can't be dynamically imported, let's use the hook directly
  // Instead, we'll inline the WebSocket connection here

  const wsRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const reconnectRef = useRef(null);
  const intentionalCloseRef = useRef(false);

  const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
  const token = localStorage.getItem('synapse_token');

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
              setMessages((prev) => {
                if (prev.some((m) => m.id === d.id)) return prev;
                return [
                  ...prev,
                  {
                    id: d.id || Date.now(),
                    user: { name: d.username, _id: d.userId },
                    text: d.content,
                    timestamp: d.timestamp,
                    isMine: d.userId === user?.id || d.userId === user?._id,
                  },
                ];
              });
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
  }, [token, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'chat:send',
      data: { content: input.trim() },
    }));
    setInput('');
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat:typing',
        data: { isTyping: true },
      }));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-primary)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--border-primary)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600' }}>Chat</span>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connected ? 'var(--accent-green)' : 'var(--accent-red)',
            display: 'inline-block',
          }} />
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: '24px', height: '24px' }}>
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-8)',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-sm)',
          }}>
            No messages yet. Say hello! ðŸ‘‹
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.isMine;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isMine ? 'row-reverse' : 'row',
                gap: 'var(--space-2)',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              {/* Avatar */}
              {!isMine && (
                <div
                  className="avatar avatar-sm"
                  style={{
                    background: generateUserColor(msg.user?.name || msg.user?._id || ''),
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {getInitials(msg.user?.name || '?')}
                </div>
              )}

              {/* Bubble */}
              <div style={{ maxWidth: '80%' }}>
                {!isMine && (
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    marginBottom: '2px',
                    marginLeft: '4px',
                  }}>
                    {msg.user?.name || 'Unknown'}
                  </div>
                )}
                <div style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: isMine ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  color: isMine ? 'white' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-lg)',
                  borderTopRightRadius: isMine ? '4px' : 'var(--radius-lg)',
                  borderTopLeftRadius: isMine ? 'var(--radius-lg)' : '4px',
                  fontSize: 'var(--text-sm)',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                  textAlign: isMine ? 'right' : 'left',
                  marginLeft: '4px',
                  marginRight: '4px',
                }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}>
            <div style={{ display: 'flex', gap: '3px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'typing 1.4s infinite' }} />
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'typing 1.4s infinite', animationDelay: '0.2s' }} />
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'typing 1.4s infinite', animationDelay: '0.4s' }} />
            </div>
            {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 'var(--space-3)',
        borderTop: '1px solid var(--border-primary)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: 'var(--space-2)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2)',
          transition: 'border-color var(--transition-fast)',
        }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
        >
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
          <button
            className="btn btn-primary btn-icon"
            onClick={handleSend}
            disabled={!input.trim()}
            style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
