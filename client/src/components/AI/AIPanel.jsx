import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Bug, BookOpen, Copy, Check, X, Plus, MessageSquare, Clock, ChevronLeft, Trash2, Zap, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAI } from '../../hooks/useAI';

export default function AIPanel({ projectId, activeFile, editorContent, language, onClose }) {
  const WELCOME_MSG = {
    role: 'assistant',
    content: "Hey! I'm **Synapse AI** â€” your coding copilot. I can debug, explain, suggest improvements, or just chat about code. What can I help with?",
  };

  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [showConvList, setShowConvList] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const {
    loading, chat, debug, explain,
    conversationId, loadConversations, loadHistory,
    resetConversation, setActiveConversation,
  } = useAI(projectId);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    async function init() {
      const convs = await loadConversations();
      setConversations(convs);
      // Auto-load the most recent conversation if it exists
      if (convs.length > 0) {
        const latestConv = convs[0];
        setActiveConversation(latestConv.id);
        const history = await loadHistory(latestConv.id);
        if (history.length > 0) {
          setMessages(history.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
          })));
        }
      }
    }
    init();
  }, [projectId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track scroll position for "scroll to bottom" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    const messageText = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const result = await chat(messageText, activeFile?._id || activeFile?.id);

    if (result) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result?.data?.response || result?.message || result?.response || result?.content || JSON.stringify(result),
          timestamp: new Date().toISOString(),
        },
      ]);
      // Refresh conversation list
      const convs = await loadConversations();
      setConversations(convs);
    } else {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() },
      ]);
    }
  };

  const handleDebug = async () => {
    if (!editorContent || loading) return;
    const userMessage = {
      role: 'user',
      content: `ðŸ› Debug this code:\n\`\`\`${language}\n${editorContent.slice(0, 2000)}\n\`\`\``,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    const result = await debug(editorContent, '', language, activeFile?._id);
    if (result) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result?.data?.analysis || result?.analysis || result?.message || result?.response || 'Analysis complete. No obvious bugs found.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleExplain = async () => {
    if (!editorContent || loading) return;
    const userMessage = {
      role: 'user',
      content: `ðŸ“– Explain this code:\n\`\`\`${language}\n${editorContent.slice(0, 2000)}\n\`\`\``,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    const result = await explain(editorContent, language);
    if (result) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result?.data?.explanation || result?.explanation || result?.message || result?.response || 'Explanation generated.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleNewChat = () => {
    resetConversation();
    setMessages([WELCOME_MSG]);
    setShowConvList(false);
  };

  const handleLoadConversation = async (conv) => {
    setActiveConversation(conv.id);
    const history = await loadHistory(conv.id);
    if (history.length > 0) {
      setMessages(history.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      })));
    } else {
      setMessages([WELCOME_MSG]);
    }
    setShowConvList(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="ai-panel">
      {/* â”€â”€ Animated Header â”€â”€ */}
      <div className="ai-panel-header">
        <div className="ai-panel-header-bg" />
        <div className="ai-panel-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.div
              className="ai-logo"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles size={16} />
            </motion.div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: 'var(--text-primary)' }}>
                Synapse AI
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent-purple)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="ai-status-dot" />
                Powered by Qwen
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className="ai-header-btn"
              onClick={() => { setShowConvList(!showConvList); }}
              title="Conversations"
            >
              <MessageSquare size={14} />
            </button>
            <button
              className="ai-header-btn"
              onClick={handleNewChat}
              title="New Chat"
            >
              <Plus size={14} />
            </button>
            <button className="ai-header-btn" onClick={onClose} title="Close">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* â”€â”€ Conversation List Drawer â”€â”€ */}
      <AnimatePresence>
        {showConvList && (
          <motion.div
            className="ai-conv-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="ai-conv-drawer-header">
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                History ({conversations.length})
              </span>
              <button className="ai-header-btn" onClick={handleNewChat} style={{ width: '22px', height: '22px' }}>
                <Plus size={12} />
              </button>
            </div>
            <div className="ai-conv-list">
              {conversations.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={`ai-conv-item ${conv.id === conversationId ? 'active' : ''}`}
                    onClick={() => handleLoadConversation(conv)}
                  >
                    <MessageSquare size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                        {conv.file_name || 'General Chat'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={9} />
                        {formatTime(conv.updated_at)}
                        {conv.message_count && <span>Â· {conv.message_count} msgs</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Quick Actions â”€â”€ */}
      <div className="ai-quick-actions">
        <motion.button
          className="ai-chip"
          onClick={handleDebug}
          disabled={loading || !editorContent}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Bug size={12} />
          <span>Debug</span>
        </motion.button>
        <motion.button
          className="ai-chip"
          onClick={handleExplain}
          disabled={loading || !editorContent}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <BookOpen size={12} />
          <span>Explain</span>
        </motion.button>
        <motion.button
          className="ai-chip"
          onClick={() => {
            if (editorContent) {
              setInput(`Suggest improvements for this code:\n\`\`\`${language}\n${editorContent.slice(0, 500)}\n\`\`\``);
              textareaRef.current?.focus();
            }
          }}
          disabled={!editorContent}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <Zap size={12} />
          <span>Improve</span>
        </motion.button>
      </div>

      {/* â”€â”€ Messages â”€â”€ */}
      <div className="ai-messages" ref={messagesContainerRef}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <MessageBubble message={msg} formatTime={formatTime} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div
            className="ai-typing-indicator"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="ai-typing-avatar">
              <Sparkles size={10} />
            </div>
            <div className="ai-typing-dots">
              <span className="ai-typing-dot" style={{ animationDelay: '0s' }} />
              <span className="ai-typing-dot" style={{ animationDelay: '0.15s' }} />
              <span className="ai-typing-dot" style={{ animationDelay: '0.3s' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thinking...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom FAB */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            className="ai-scroll-btn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
          >
            <ArrowDown size={14} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* â”€â”€ Input Area â”€â”€ */}
      <div className="ai-input-area">
        <div className="ai-input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your code..."
            rows={1}
            className="ai-input"
          />
          <motion.button
            className="ai-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Send size={14} />
          </motion.button>
        </div>
        <div className="ai-input-hint">
          <kbd>Enter</kbd> send Â· <kbd>Shift+Enter</kbd> newline
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, formatTime }) {
  const [copied, setCopied] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const isUser = message.role === 'user';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Markdown-like rendering with support for bold, italic, headers, lists, code blocks
  const renderContent = (content) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.slice(3, -3).split('\n');
        const lang = lines[0].trim();
        const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
        return (
          <div key={i} className="ai-code-block">
            <div className="ai-code-header">
              <span>{lang || 'code'}</span>
              <button onClick={() => copyToClipboard(code)} className="ai-code-copy-btn">
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="ai-code-content">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      // Render inline elements
      return <span key={i}>{renderInlineMarkdown(part)}</span>;
    });
  };

  const renderInlineMarkdown = (text) => {
    // Split into lines for block-level elements
    const lines = text.split('\n');
    const elements = [];

    for (let li = 0; li < lines.length; li++) {
      let line = lines[li];

      // Headers
      const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        const Tag = `h${level + 2}`; // h3, h4, h5
        elements.push(
          <Tag key={`h-${li}`} style={{
            fontSize: level === 1 ? 'var(--text-base)' : level === 2 ? 'var(--text-sm)' : 'var(--text-xs)',
            fontWeight: '600',
            margin: '8px 0 4px',
            color: 'var(--text-primary)',
          }}>
            {renderInlineFormatting(headerText)}
          </Tag>
        );
        continue;
      }

      // List items
      const listMatch = line.match(/^(\s*)[-*]\s+(.+)/);
      if (listMatch) {
        elements.push(
          <div key={`li-${li}`} style={{
            paddingLeft: `${12 + (listMatch[1].length * 8)}px`,
            position: 'relative',
            margin: '2px 0',
          }}>
            <span style={{ position: 'absolute', left: `${listMatch[1].length * 8}px`, color: 'var(--accent-purple)' }}>â€¢</span>
            {renderInlineFormatting(listMatch[2])}
          </div>
        );
        continue;
      }

      // Numbered list items
      const numMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
      if (numMatch) {
        elements.push(
          <div key={`nl-${li}`} style={{ paddingLeft: '12px', margin: '2px 0' }}>
            {renderInlineFormatting(numMatch[2])}
          </div>
        );
        continue;
      }

      // Normal text
      if (line.trim()) {
        elements.push(
          <span key={`t-${li}`}>
            {renderInlineFormatting(line)}
            {li < lines.length - 1 ? '\n' : ''}
          </span>
        );
      } else if (li < lines.length - 1) {
        elements.push(<span key={`br-${li}`}>{'\n'}</span>);
      }
    }

    return elements;
  };

  const renderInlineFormatting = (text) => {
    // Bold, italic, inline code
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={j} style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.slice(2, -2)}</strong>;
      }
      if (p.startsWith('`') && p.endsWith('`')) {
        return (
          <code key={j} className="ai-inline-code">
            {p.slice(1, -1)}
          </code>
        );
      }
      if (p.startsWith('*') && p.endsWith('*') && !p.startsWith('**')) {
        return <em key={j}>{p.slice(1, -1)}</em>;
      }
      return <span key={j}>{p}</span>;
    });
  };

  return (
    <div
      className={`ai-message ${isUser ? 'ai-message-user' : 'ai-message-assistant'}`}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {!isUser && (
        <div className="ai-message-avatar">
          <Sparkles size={10} />
        </div>
      )}
      <div className={`ai-message-bubble ${isUser ? 'ai-bubble-user' : 'ai-bubble-assistant'}`}>
        {!isUser && (
          <div className="ai-message-label">
            <Sparkles size={9} />
            Synapse AI
          </div>
        )}
        <div className="ai-message-content">{renderContent(message.content)}</div>
        <AnimatePresence>
          {showTime && message.timestamp && (
            <motion.div
              className="ai-message-time"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {formatTime(message.timestamp)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
