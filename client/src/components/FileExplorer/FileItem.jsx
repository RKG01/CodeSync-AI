import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, FileCode2, Globe, Palette, Braces, FileText, Terminal, Trash2, Pencil } from 'lucide-react';
import { getLanguageFromFilename } from '../../utils/helpers';
import { getFileIconColor } from '../../utils/languageConfig';

const fileIcons = {
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
};

function getFileIconComponent(name) {
  const lang = getLanguageFromFilename(name || '');
  return fileIcons[lang] || File;
}

export default function FileItem({ node, depth, isActive, onSelect, onDelete, children }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showContext, setShowContext] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name || '');
  const contextRef = useRef(null);
  const isFolder = node.type === 'folder';

  useEffect(() => {
    const handler = (e) => {
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setShowContext(false);
      }
    };
    if (showContext) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showContext]);

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    } else {
      onSelect();
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextPos({ x: e.clientX, y: e.clientY });
    setShowContext(true);
  };

  const Icon = isFolder
    ? (expanded ? FolderOpen : Folder)
    : getFileIconComponent(node.name || node.path);

  const iconColor = isFolder
    ? 'var(--accent-blue)'
    : getFileIconColor(node.name || node.path);

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: '3px var(--space-2)',
          paddingLeft: `${8 + depth * 16}px`,
          fontSize: 'var(--text-xs)',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: isActive ? 'var(--accent-blue-subtle)' : 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background var(--transition-fast)',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Indentation guides */}
        {Array.from({ length: depth }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${12 + i * 16}px`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'var(--border-primary)',
            }}
          />
        ))}

        {/* Chevron for folders */}
        {isFolder ? (
          <span style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span style={{ width: '14px', flexShrink: 0 }} />
        )}

        {/* Icon */}
        <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />

        {/* Name */}
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => setIsRenaming(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsRenaming(false);
              if (e.key === 'Escape') { setRenameValue(node.name); setIsRenaming(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--accent-blue)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-xs)',
              padding: '0 4px',
              borderRadius: '2px',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              width: '100%',
            }}
          />
        ) : (
          <span className="truncate" style={{ lineHeight: '1.4' }}>
            {node.name || node.path?.split('/').pop() || 'untitled'}
          </span>
        )}
      </div>

      {/* Context Menu */}
      {showContext && (
        <div
          ref={contextRef}
          className="context-menu"
          style={{ left: contextPos.x, top: contextPos.y }}
        >
          <button
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowContext(false);
              setIsRenaming(true);
            }}
          >
            <Pencil size={13} />
            Rename
          </button>
          <button
            className="dropdown-item dropdown-item-danger"
            onClick={(e) => {
              e.stopPropagation();
              setShowContext(false);
              onDelete();
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}

      {/* Children (expanded folder) */}
      {isFolder && expanded && children}
    </div>
  );
}
