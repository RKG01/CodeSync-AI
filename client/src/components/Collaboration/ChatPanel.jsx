import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInitials, generateUserColor, formatTime } from '../../utils/helpers';

export default function ChatPanel({ onClose, sendMessage, messages: externalMessages, subscribe }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(externalMessages || []);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    if (externalMessages) {
      setMessages(externalMessages);
    }
  }, [externalMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to incoming chat messages
  useEffect(() => {
    if (!subscribe) return;

    const unsub1 = subscribe('chat_message', (data) => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        user: data.user || { name: 'Unknown' },
        text: data.message || data.text,
        timestamp: data.timestamp || new Date().toISOString(),
        isMine: false,
      }]);
    });

    const unsub2 = subscribe('user_typing', (data) => {
      if (data.userId !== user?._id) {
        setTypingUsers((prev) => {
          const exists = prev.find((u) => u.id === data.userId);
          if (!exists) return [...prev, { id: data.userId, name: data.username || 'Someone' }];
          return prev;
        });
        // Remove typing indicator after 3s
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== data.userId));
        }, 3000);
      }
    });

    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, [subscribe, user]);

  const handleSend = () => {
    if (!input.trim()) return;

    const msg = {
      id: Date.now(),
      user: { name: user?.username || user?.email || 'You', _id: user?._id },
      text: input.trim(),
      timestamp: new Date().toISOString(),
      isMine: true,
    };

    setMessages((prev) => [...prev, msg]);
    sendMessage?.('chat_message', { message: input.trim(), userId: user?._id, username: user?.username });
    setInput('');
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Send typing indicator
    clearTimeout(typingTimerRef.current);
    sendMessage?.('user_typing', { userId: user?._id, username: user?.username });
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
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600' }}>Chat</span>
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
            No messages yet. Say hello! 👋
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.isMine || msg.user?._id === user?._id;
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
