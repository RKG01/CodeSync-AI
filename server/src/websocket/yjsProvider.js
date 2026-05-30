/**
 * @module websocket/yjsProvider
 * @description Yjs WebSocket provider server for real-time collaborative document editing.
 * Uses y-protocols for sync and awareness, with Redis persistence.
 */

import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import redisClient, { isRedisReady } from '../config/redis.js';

/** Message type constants matching y-protocols */
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** Active Yjs documents in memory */
const docs = new Map();

/** Document persistence TTL in seconds (24 hours) */
const DOC_PERSIST_TTL = 86400;

/**
 * Gets or creates a Yjs document for the given room name.
 * Loads persisted state from Redis if available.
 * @param {string} docName - The document/room name (typically projectId:fileId).
 * @returns {Promise<Object>} Object containing { doc, awareness }.
 */
async function getYDoc(docName) {
  if (docs.has(docName)) {
    return docs.get(docName);
  }

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  // Load persisted state from Redis
  if (isRedisReady()) {
    try {
      const persistedState = await redisClient.getBuffer(`ydoc:${docName}`);
      if (persistedState) {
        Y.applyUpdate(doc, new Uint8Array(persistedState));
        console.log(`📄 Loaded persisted Yjs doc: ${docName}`);
      }
    } catch (error) {
      console.error(`Failed to load Yjs doc ${docName}:`, error.message);
    }
  }

  // Set up periodic persistence
  const persistInterval = setInterval(async () => {
    await persistDoc(docName, doc);
  }, 30000); // Persist every 30 seconds

  // Clean up awareness on no connections
  awareness.on('update', ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated).concat(removed);
    const encoderAwareness = encoding.createEncoder();
    encoding.writeVarUint(encoderAwareness, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoderAwareness,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const awarenessMessage = encoding.toUint8Array(encoderAwareness);

    const entry = docs.get(docName);
    if (entry) {
      for (const conn of entry.connections) {
        if (conn.readyState === conn.OPEN) {
          conn.send(awarenessMessage);
        }
      }
    }
  });

  const entry = { doc, awareness, connections: new Set(), persistInterval };
  docs.set(docName, entry);

  return entry;
}

/**
 * Persists a Yjs document state to Redis.
 * @param {string} docName - The document name.
 * @param {Y.Doc} doc - The Yjs document.
 * @returns {Promise<void>}
 */
async function persistDoc(docName, doc) {
  if (!isRedisReady()) return;

  try {
    const state = Y.encodeStateAsUpdate(doc);
    await redisClient.set(`ydoc:${docName}`, Buffer.from(state), { EX: DOC_PERSIST_TTL });
  } catch (error) {
    console.error(`Failed to persist Yjs doc ${docName}:`, error.message);
  }
}

/**
 * Handles a new WebSocket connection for Yjs document sync.
 * @param {import('ws').WebSocket} ws - The WebSocket connection.
 * @param {string} docName - The document/room name.
 * @returns {Promise<void>}
 */
async function handleConnection(ws, docName) {
  const entry = await getYDoc(docName);
  const { doc, awareness } = entry;

  entry.connections.add(ws);
  console.log(`🔗 Yjs client connected to: ${docName} (${entry.connections.size} clients)`);

  // Send sync step 1
  const encoderSync = encoding.createEncoder();
  encoding.writeVarUint(encoderSync, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoderSync, doc);
  ws.send(encoding.toUint8Array(encoderSync));

  // Send current awareness state
  const awarenessStates = awareness.getStates();
  if (awarenessStates.size > 0) {
    const encoderAwareness = encoding.createEncoder();
    encoding.writeVarUint(encoderAwareness, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoderAwareness,
      awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
    );
    ws.send(encoding.toUint8Array(encoderAwareness));
  }

  // Listen for document updates and broadcast to ALL clients in the room
  const updateHandler = (update, origin) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    for (const conn of entry.connections) {
      // Don't echo back to the sender
      if (conn !== origin && conn.readyState === conn.OPEN) {
        conn.send(message);
      }
    }
  };
  doc.on('update', updateHandler);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = new Uint8Array(data);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC: {
          const encoderResponse = encoding.createEncoder();
          encoding.writeVarUint(encoderResponse, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, encoderResponse, doc, ws);

          if (encoding.length(encoderResponse) > 1) {
            ws.send(encoding.toUint8Array(encoderResponse));
          }
          break;
        }
        case MESSAGE_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            ws
          );
          break;
        }
        default:
          console.warn(`Unknown Yjs message type: ${messageType}`);
      }
    } catch (error) {
      console.error('Yjs message handling error:', error.message);
    }
  });

  // Handle disconnect
  ws.on('close', async () => {
    entry.connections.delete(ws);
    doc.off('update', updateHandler);

    // Remove awareness state for this connection
    awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);

    console.log(`🔌 Yjs client disconnected from: ${docName} (${entry.connections.size} clients)`);

    // If no more connections, persist and clean up after a delay
    if (entry.connections.size === 0) {
      await persistDoc(docName, doc);

      // Keep doc in memory for 60 seconds in case someone reconnects
      setTimeout(() => {
        const currentEntry = docs.get(docName);
        if (currentEntry && currentEntry.connections.size === 0) {
          clearInterval(currentEntry.persistInterval);
          currentEntry.doc.destroy();
          docs.delete(docName);
          console.log(`🗑️  Cleaned up Yjs doc: ${docName}`);
        }
      }, 60000);
    }
  });

  ws.on('error', (error) => {
    console.error(`Yjs WebSocket error (${docName}):`, error.message);
  });
}

/**
 * Creates and starts the Yjs WebSocket server.
 * @returns {WebSocketServer} The configured WebSocket server instance.
 */
export function createYjsServer() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    // Extract document name from URL path (e.g., /yjs/projectId:fileId)
    const url = new URL(req.url, `http://localhost`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const docName = pathParts[pathParts.length - 1] || 'default';

    handleConnection(ws, docName);
  });

  wss.on('error', (error) => {
    console.error('Yjs WebSocket server error:', error.message);
  });

  console.log(`🔄 Yjs WebSocket server initialized (attached to main HTTP)`);

  return wss;
}

/**
 * Gracefully shuts down the Yjs server, persisting all documents.
 * @returns {Promise<void>}
 */
export async function shutdownYjs() {
  console.log('Persisting all Yjs documents before shutdown...');

  for (const [docName, entry] of docs.entries()) {
    clearInterval(entry.persistInterval);
    await persistDoc(docName, entry.doc);
    entry.doc.destroy();

    for (const conn of entry.connections) {
      conn.close();
    }
  }

  docs.clear();
  console.log('✅ All Yjs documents persisted and cleaned up');
}

export default { createYjsServer, shutdownYjs };
