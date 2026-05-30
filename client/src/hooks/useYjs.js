import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { generateUserColor } from '../utils/helpers';

const BASE_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
const YJS_WS_URL = `${BASE_WS_URL}/yjs`;

/**
 * Custom hook for Yjs real-time collaborative editing.
 * Creates a Y.Doc and WebsocketProvider per file.
 *
 * IMPORTANT: doc, provider, and awareness are stored in state (not refs)
 * so that downstream components re-render when they become available.
 */
export function useYjs(projectId, filePath, userInfo) {
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [doc, setDoc] = useState(null);
  const [provider, setProvider] = useState(null);
  const [awareness, setAwareness] = useState(null);

  // Keep a ref to userInfo to avoid re-running the effect when the object identity changes
  const userInfoRef = useRef(userInfo);
  userInfoRef.current = userInfo;

  useEffect(() => {
    if (!projectId || !filePath) {
      setDoc(null);
      setProvider(null);
      setAwareness(null);
      setConnected(false);
      setSynced(false);
      return;
    }

    const roomName = `${projectId}:${filePath}`;
    console.log(`[useYjs] Connecting to room: ${roomName} via ${YJS_WS_URL}`);

    const yDoc = new Y.Doc();
    const yProvider = new WebsocketProvider(YJS_WS_URL, roomName, yDoc, {
      connect: true,
      params: {},
    });
    const yAwareness = yProvider.awareness;

    // Set awareness info for cursor labels
    const ui = userInfoRef.current;
    if (ui) {
      yAwareness.setLocalStateField('user', {
        name: ui.name || ui.username || 'Anonymous',
        color: ui.color || generateUserColor(ui._id || ui.name || 'default'),
        id: ui._id || ui.id || Math.random().toString(36).slice(2),
      });
    }

    const handleStatus = ({ status }) => {
      console.log(`[useYjs] Status: ${status}`);
      setConnected(status === 'connected');
    };

    const handleSync = (isSynced) => {
      console.log(`[useYjs] Synced: ${isSynced}`);
      setSynced(isSynced);
    };

    yProvider.on('status', handleStatus);
    yProvider.on('sync', handleSync);

    // Publish to state so consumers re-render
    setDoc(yDoc);
    setProvider(yProvider);
    setAwareness(yAwareness);

    return () => {
      console.log(`[useYjs] Disconnecting from room: ${roomName}`);
      yProvider.off('status', handleStatus);
      yProvider.off('sync', handleSync);
      yProvider.disconnect();
      yProvider.destroy();
      yDoc.destroy();
      setDoc(null);
      setProvider(null);
      setAwareness(null);
      setConnected(false);
      setSynced(false);
    };
  }, [projectId, filePath]);

  return {
    doc,
    provider,
    awareness,
    connected,
    synced,
  };
}

export default useYjs;
