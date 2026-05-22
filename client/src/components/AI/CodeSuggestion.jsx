import React from 'react';

/**
 * Code suggestion overlay — renders inline ghost text (like GitHub Copilot).
 * This integrates with Monaco's inline completion provider.
 *
 * Usage: Set up a Monaco CompletionItemProvider that returns ghost text.
 * This component provides the visual styling.
 */
export default function CodeSuggestion({ suggestion, onAccept, onDismiss }) {
  if (!suggestion) return null;

  return (
    <div
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* The actual ghost text is handled by Monaco's inline suggestions.
          This component serves as a UI controller and can show a hint bar. */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(var(--statusbar-height) + 8px)',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-1) var(--space-3)',
          background: 'var(--surface-glass-heavy)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          animation: 'fadeIn 0.2s ease-out',
          pointerEvents: 'auto',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <span>
          <kbd style={{
            padding: '1px 5px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-secondary)',
            borderRadius: '3px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
          }}>
            Tab
          </kbd>
          {' '}to accept
        </span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>
          <kbd style={{
            padding: '1px 5px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-secondary)',
            borderRadius: '3px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
          }}>
            Esc
          </kbd>
          {' '}to dismiss
        </span>
      </div>
    </div>
  );
}

/**
 * Style for ghost text in Monaco (to be applied via editor decorations):
 */
export const ghostTextStyle = {
  color: 'rgba(148, 163, 184, 0.4)',
  fontStyle: 'italic',
};
