import React from 'react';
import { X, FileCode2, FileText, Globe, Palette, Braces, Terminal, File } from 'lucide-react';
import { getLanguageFromFilename, classNames } from '../../utils/helpers';
import { getFileIconColor } from '../../utils/languageConfig';

const iconMap = {
  javascript: FileCode2,
  typescript: FileCode2,
  python: FileCode2,
  java: FileCode2,
  cpp: FileCode2,
  c: FileCode2,
  go: FileCode2,
  rust: FileCode2,
  html: Globe,
  css: Palette,
  scss: Palette,
  json: Braces,
  markdown: FileText,
  shell: Terminal,
  plaintext: File,
};

function getIcon(filename) {
  const lang = getLanguageFromFilename(filename);
  return iconMap[lang] || File;
}

export default function EditorTabs({ openFiles, activeFile, onSelectTab, onCloseTab, unsavedFiles = new Set() }) {
  if (!openFiles || openFiles.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      height: '36px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-primary)',
      overflowX: 'auto',
      overflowY: 'hidden',
      flexShrink: 0,
    }}>
      {openFiles.map((file) => {
        const isActive = activeFile && (activeFile._id === file._id || activeFile.path === file.path);
        const fileId = file._id || file.path;
        const isUnsaved = unsavedFiles.has(fileId);
        const Icon = getIcon(file.name || file.path);
        const iconColor = getFileIconColor(file.name || file.path);
        const displayName = file.name || file.path?.split('/').pop() || 'untitled';

        return (
          <div
            key={fileId}
            onClick={() => onSelectTab(fileId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '0 var(--space-3)',
              fontSize: 'var(--text-xs)',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive ? 'var(--bg-primary)' : 'transparent',
              borderRight: '1px solid var(--border-primary)',
              borderBottom: isActive ? '1px solid var(--bg-primary)' : '1px solid transparent',
              borderTop: isActive ? '1px solid var(--accent-blue)' : '1px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
              position: 'relative',
              minWidth: '0',
              maxWidth: '180px',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
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
            <Icon size={13} style={{ color: iconColor, flexShrink: 0 }} />
            <span className="truncate">{displayName}</span>

            {/* Unsaved indicator */}
            {isUnsaved && (
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent-orange)',
                flexShrink: 0,
              }} />
            )}

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(fileId);
              }}
              style={{
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                borderRadius: '3px',
                transition: 'all var(--transition-fast)',
                flexShrink: 0,
                opacity: isActive ? 0.6 : 0,
                marginLeft: 'auto',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.opacity = isActive ? '0.6' : '0';
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
