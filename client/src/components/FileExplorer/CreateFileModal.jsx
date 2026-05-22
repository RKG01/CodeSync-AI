import React, { useState } from 'react';
import { X, File, Folder, Plus } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../utils/languageConfig';

export default function CreateFileModal({ onClose, onCreate, parentFolder }) {
  const [type, setType] = useState('file');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('javascript');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const path = parentFolder ? `${parentFolder}/${name.trim()}` : name.trim();
    onCreate(name.trim(), path, type, type === 'file' ? language : undefined);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '380px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Create New {type === 'file' ? 'File' : 'Folder'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className={`btn ${type === 'file' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setType('file')}
              style={{ flex: 1 }}
            >
              <File size={14} />
              File
            </button>
            <button
              type="button"
              className={`btn ${type === 'folder' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setType('folder')}
              style={{ flex: 1 }}
            >
              <Folder size={14} />
              Folder
            </button>
          </div>

          {/* Parent folder display */}
          {parentFolder && (
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}>
              Parent: <span style={{ color: 'var(--text-secondary)' }}>{parentFolder}/</span>
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="input-label">Name</label>
            <input
              type="text"
              className="input"
              placeholder={type === 'file' ? 'index.js' : 'components'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Language selector for files */}
          {type === 'file' && (
            <div>
              <label className="input-label">Language</label>
              <select
                className="input"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>{lang.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              <Plus size={14} />
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
