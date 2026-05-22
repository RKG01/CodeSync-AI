import { useState, useEffect, useCallback } from 'react';

/**
 * Presence hook using Yjs awareness protocol.
 * Returns a list of online users with their cursor info and colors.
 */
export function usePresence(awareness) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const userList = [];

      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID) return; // skip self
        if (state.user) {
          userList.push({
            clientId,
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#3b82f6',
            id: state.user.id || String(clientId),
            cursor: state.cursor || null,
            selection: state.selection || null,
          });
        }
      });

      setUsers(userList);
    };

    awareness.on('change', updateUsers);
    updateUsers();

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [awareness]);

  const updateCursor = useCallback(
    (cursor) => {
      if (!awareness) return;
      awareness.setLocalStateField('cursor', cursor);
    },
    [awareness]
  );

  const updateSelection = useCallback(
    (selection) => {
      if (!awareness) return;
      awareness.setLocalStateField('selection', selection);
    },
    [awareness]
  );

  return {
    users,
    updateCursor,
    updateSelection,
  };
}

export default usePresence;
