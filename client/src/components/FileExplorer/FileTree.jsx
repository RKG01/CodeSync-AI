import React, { useState, useContext } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { EditorContext } from '../../contexts/EditorContext';
import { getFileIconColor } from '../../utils/languageConfig';
import { getLanguageFromFilename } from '../../utils/helpers';
import FileItem from './FileItem';

export default function FileTree({ files = [], projectId, onCreateFile }) {
  const { openFile, activeFile, deleteFile } = useContext(EditorContext);

  // Normalize backend fields to frontend-expected fields
  const normalized = normalizeFiles(files);

  // Build tree from flat file list
  const tree = buildTree(normalized);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-3)',
        borderBottom: '1px solid var(--border-primary)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 'var(--text-xs)',
          fontWeight: '600',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Explorer
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onCreateFile?.('file')}
            title="New File"
            style={{ width: '24px', height: '24px' }}
          >
            <File size={13} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onCreateFile?.('folder')}
            title="New Folder"
            style={{ width: '24px', height: '24px' }}
          >
            <Folder size={13} />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-1) 0' }}>
        {tree.length === 0 ? (
          <div style={{
            padding: 'var(--space-6) var(--space-4)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
          }}>
            No files yet.
            <br />
            <button
              onClick={() => onCreateFile?.('file')}
              style={{
                marginTop: 'var(--space-2)',
                color: 'var(--accent-blue)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Create a file
            </button>
          </div>
        ) : (
          <TreeNode
            nodes={tree}
            depth={0}
            activeFile={activeFile}
            onSelect={(file) => openFile(file)}
            onDelete={(fileId) => deleteFile(projectId, fileId)}
          />
        )}
      </div>
    </div>
  );
}

function TreeNode({ nodes, depth, activeFile, onSelect, onDelete }) {
  return (
    <>
      {nodes.map((node) => {
        // Match active file by id, _id, or path
        const activeId = activeFile?.id || activeFile?._id;
        const nodeId = node.id || node._id;
        const isActive = activeFile && (activeId === nodeId || activeFile.path === node.path);

        return (
          <FileItem
            key={node.id || node._id || node.path}
            node={node}
            depth={depth}
            isActive={isActive}
            onSelect={() => {
              if (node.type !== 'folder') {
                onSelect(node);
              }
            }}
            onDelete={() => onDelete(node.id || node._id)}
          >
            {node.children && node.children.length > 0 && (
              <TreeNode
                nodes={node.children}
                depth={depth + 1}
                activeFile={activeFile}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            )}
          </FileItem>
        );
      })}
    </>
  );
}

/**
 * Normalize backend file objects to frontend-expected shape.
 * Backend returns: { id, is_directory, parent_id, ... }
 * Frontend expects: { id, _id, type: 'folder'|'file', parentId, ... }
 */
function normalizeFiles(files) {
  if (!files || files.length === 0) return [];
  return files.map((f) => ({
    ...f,
    _id: f._id || f.id,
    type: (f.type === 'folder' || f.is_directory) ? 'folder' : 'file',
    parentId: f.parentId || f.parent_id || null,
  }));
}

/**
 * Build a tree structure from flat file list.
 */
function buildTree(files) {
  if (!files || files.length === 0) return [];

  // If files already have children, they're already a tree
  if (files.some((f) => f.children)) {
    return files;
  }

  // Build tree from path-based flat list
  const root = [];
  const map = new Map();

  // Sort: folders first, then alphabetical
  const sorted = [...files].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return (a.name || a.path || '').localeCompare(b.name || b.path || '');
  });

  sorted.forEach((file) => {
    const node = { ...file, children: file.type === 'folder' ? [] : undefined };
    map.set(file.id || file._id, node);

    if (file.parentId) {
      const parent = map.get(file.parentId);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
    } else {
      root.push(node);
    }
  });

  return root;
}
