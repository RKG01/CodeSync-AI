import React from 'react';
import { Wifi, WifiOff, Users } from 'lucide-react';

export default function StatusBar({
  language = 'plaintext',
  line = 1,
  column = 1,
  encoding = 'UTF-8',
  connected = false,
  onlineCount = 0,
}) {
  return (
    <div style={{
      height: 'var(--statusbar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-3)',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-primary)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          {connected ? (
            <>
              <div className="dot dot-green" style={{ width: '6px', height: '6px' }} />
              <span>Connected</span>
            </>
          ) : (
            <>
              <div className="dot dot-red" style={{ width: '6px', height: '6px' }} />
              <span>Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Online users */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <Users size={11} />
          <span>{onlineCount} online</span>
        </div>

        {/* Cursor position */}
        <span>Ln {line}, Col {column}</span>

        {/* Encoding */}
        <span>{encoding}</span>

        {/* Language */}
        <div style={{
          padding: '1px 8px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          fontWeight: '500',
          color: 'var(--text-secondary)',
          textTransform: 'capitalize',
        }}>
          {language}
        </div>
      </div>
    </div>
  );
}
