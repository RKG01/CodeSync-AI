import React from 'react';
import { getInitials, generateUserColor } from '../../utils/helpers';

export default function PresenceBar({ users = [], onFollowUser }) {
  if (users.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      padding: '0 var(--space-2)',
    }}>
      {users.map((user) => (
        <div
          key={user.clientId || user.id}
          className="tooltip-wrapper"
          onClick={() => onFollowUser?.(user)}
          style={{ cursor: 'pointer' }}
        >
          <div
            className="avatar avatar-sm avatar-online"
            style={{
              background: user.color || generateUserColor(user.name),
              transition: 'transform var(--transition-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {getInitials(user.name)}
          </div>
          <span className="tooltip">{user.name}</span>
        </div>
      ))}

      {users.length > 0 && (
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          marginLeft: 'var(--space-1)',
        }}>
          {users.length} online
        </span>
      )}
    </div>
  );
}
