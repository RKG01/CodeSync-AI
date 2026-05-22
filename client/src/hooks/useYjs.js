import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { generateUserColor } from '../utils/helpers';

const YJS_WS_URL = import.meta.env.VITE_YJS_WS_URL || 'ws://localhost:1234';

/**
 * Custom hook for Yjs real-time collaborative editing.
 * Creates a Y.Doc and WebsocketProvider per file.
 */
export function useYjs(projectId, filePath, userInfo) {
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const docRef = useRef(null);
  const providerRef = useRef(null);

  useEffect(() => {
    if (!projectId || !filePath) return;

    const roomName = `${projectId}:${filePath}`;
    const doc = new Y.Doc();
    docRef.current = doc;

    const provider = new WebsocketProvider(YJS_WS_URL, roomName, doc, {
      connect: true,
      params: {},
    });
    providerRef.current = provider;

    // Set awareness info
    if (userInfo) {
      provider.awareness.setLocalStateField('user', {
        name: userInfo.name || userInfo.username || 'Anonymous',
        color: userInfo.color || generateUserColor(userInfo._id || userInfo.name || 'default'),
        id: userInfo._id || userInfo.id || Math.random().toString(36).slice(2),
      });
    }

    const handleStatus = ({ status }) => {
      setConnected(status === 'connected');
    };

    const handleSync = (isSynced) => {
      setSynced(isSynced);
    };

    provider.on('status', handleStatus);
    provider.on('sync', handleSync);

    return () => {
      provider.off('status', handleStatus);
      provider.off('sync', handleSync);
      provider.disconnect();
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      setConnected(false);
      setSynced(false);
    };
  }, [projectId, filePath, userInfo?.name, userInfo?._id]);

  const getDoc = useCallback(() => docRef.current, []);
  const getProvider = useCallback(() => providerRef.current, []);
  const getAwareness = useCallback(() => providerRef.current?.awareness || null, []);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    awareness: providerRef.current?.awareness || null,
    connected,
    synced,
    getDoc,
    getProvider,
    getAwareness,
  };
}

export default useYjs;
