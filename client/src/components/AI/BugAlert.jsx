import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bug, X, Zap, CheckCircle2 } from 'lucide-react';

const severityConfig = {
  critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', icon: AlertTriangle, label: 'Critical' },
  high: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', icon: AlertTriangle, label: 'High' },
  medium: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', icon: Bug, label: 'Medium' },
  low: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', icon: Bug, label: 'Low' },
};

export default function BugAlert({ bug, onApplyFix, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [applied, setApplied] = useState(false);

  const severity = severityConfig[bug?.severity] || severityConfig.medium;
  const SeverityIcon = severity.icon;

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss after 10s
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 300);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  const handleApplyFix = () => {
    setApplied(true);
    onApplyFix?.(bug);
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 300);
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '16px',
      width: '340px',
      background: 'var(--bg-secondary)',
      border: `1px solid ${severity.border}`,
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      zIndex: 'var(--z-toast)',
      transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 20px))',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      overflow: 'hidden',
    }}>
      {/* Severity accent line */}
      <div style={{
        height: '2px',
        background: severity.color,
        boxShadow: `0 0 8px ${severity.color}40`,
      }} />

      <div style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            background: severity.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <SeverityIcon size={14} style={{ color: severity.color }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <span className="badge" style={{
                background: severity.bg,
                color: severity.color,
                border: `1px solid ${severity.border}`,
                fontSize: '10px',
              }}>
                {severity.label}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                Bug Detected
              </span>
            </div>
            <p style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              marginBottom: 'var(--space-3)',
            }}>
              {bug?.description || 'Potential issue found in your code.'}
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {!applied ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={handleApplyFix}>
                    <Zap size={12} />
                    Apply Fix
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={handleDismiss}>
                    Dismiss
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--accent-green)', fontSize: 'var(--text-xs)' }}>
                  <CheckCircle2 size={14} />
                  Fix applied!
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
