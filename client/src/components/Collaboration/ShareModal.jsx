import React, { useState, useEffect } from 'react';
import { X, Copy, Check, UserPlus, Trash2, Link2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getInitials, generateUserColor } from '../../utils/helpers';

export default function ShareModal({ projectId, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const data = await api.get(`/projects/${projectId}/collaborators`, { silent: true });
      setCollaborators(data.collaborators || data || []);
    } catch {
      // Silent fail
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/collaborators`, {
        email: email.trim(),
        role,
      });
      toast.success('Invitation sent!');
      setEmail('');
      fetchCollaborators();
    } catch (err) {
      toast.error(err.message || 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await api.delete(`/projects/${projectId}/collaborators/${userId}`);
      setCollaborators((prev) => prev.filter((c) => c._id !== userId && c.userId !== userId));
      toast.success('Collaborator removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove');
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/editor/${projectId}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success('Link copied!');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Share Project</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Invite Input */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <input
            type="email"
            className="input"
            placeholder="Enter email to invite"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            style={{ flex: 1 }}
          />
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100px', cursor: 'pointer' }}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button className="btn btn-primary" onClick={handleInvite} disabled={loading || !email.trim()}>
            <UserPlus size={14} />
          </button>
        </div>

        {/* Copy link */}
        <button
          className="btn btn-secondary w-full"
          onClick={copyLink}
          style={{ marginBottom: 'var(--space-6)', justifyContent: 'center' }}
        >
          {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
          {linkCopied ? 'Link Copied!' : 'Copy Invite Link'}
        </button>

        {/* Collaborators List */}
        {collaborators.length > 0 && (
          <>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: '600',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-3)',
            }}>
              Collaborators ({collaborators.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '200px', overflow: 'auto' }}>
              {collaborators.map((collab) => {
                const name = collab.username || collab.email || collab.name || 'Unknown';
                return (
                  <div
                    key={collab._id || collab.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div
                      className="avatar avatar-sm"
                      style={{ background: generateUserColor(name) }}
                    >
                      {getInitials(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }} className="truncate">
                        {name}
                      </div>
                      {collab.email && collab.email !== name && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }} className="truncate">
                          {collab.email}
                        </div>
                      )}
                    </div>
                    <span className={`badge ${collab.role === 'owner' ? 'badge-purple' : collab.role === 'editor' ? 'badge-blue' : 'badge-green'}`}>
                      {collab.role || 'editor'}
                    </span>
                    {collab.role !== 'owner' && (
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleRemove(collab._id || collab.userId)}
                        style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
