import React from 'react';
import { FolderTree, Sparkles, MessageSquare, Settings } from 'lucide-react';

const sidebarItems = [
  { id: 'files', icon: FolderTree, label: 'File Explorer' },
  { id: 'ai', icon: Sparkles, label: 'AI Assistant' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ activePanel, onPanelToggle }) {
  return (
    <div style={{
      width: 'var(--sidebar-width)',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 'var(--space-2)',
      gap: 'var(--space-1)',
      flexShrink: 0,
    }}>
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePanel === item.id;
        return (
          <div key={item.id} className="tooltip-wrapper">
            <button
              onClick={() => onPanelToggle(item.id)}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? 'var(--accent-blue-subtle)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: '-1px',
                  top: '6px',
                  bottom: '6px',
                  width: '2px',
                  background: 'var(--accent-blue)',
                  borderRadius: '1px',
                }} />
              )}
              <Icon size={18} />
            </button>
            <span className="tooltip tooltip-right">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
