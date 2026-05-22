/**
 * @module websocket/wsHandler
 * @description Main WebSocket connection handler. Authenticates connections via JWT
 * and routes to the appropriate handler (Yjs or chat) based on the URL path.
 */

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { handleChatConnection } from './chatHandler.js';
import { addUser, removeUser } from '../services/presenceService.js';

/**
 * Sets up the main WebSocket handler on an HTTP server.
 * Handles two types of WebSocket connections:
 * - `/ws/chat/:projectId` — Real-time chat messaging
 * - `/ws/presence/:projectId` — Presence and cursor tracking
 *
 * @param {import('http').Server} server - The HTTP server to attach WebSocket to.
 * @returns {WebSocketServer} The configured WebSocket server.
 */
export function setupWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: undefined, // Accept all paths, we route manually
    verifyClient: (info, done) => {
      // Only accept connections to known WebSocket paths
      const url = new URL(info.req.url, `http://localhost`);
      const pathname = url.pathname;

      if (pathname.startsWith('/ws/chat/') || pathname.startsWith('/ws/presence/')) {
        done(true);
      } else {
        done(false, 404, 'Unknown WebSocket path');
      }
    },
  });

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url, `http://localhost`);
      const pathname = url.pathname;

      // Authenticate via JWT in query params
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication required. Provide token as query parameter.');
        return;
      }

      let user;
      try {
        user = jwt.verify(token, env.JWT_SECRET);
      } catch (error) {
        ws.close(4001, 'Invalid or expired authentication token.');
        return;
      }

      // Route based on path
      if (pathname.startsWith('/ws/chat/')) {
        const projectId = pathname.replace('/ws/chat/', '');
        if (!projectId) {
          ws.close(4002, 'Project ID is required.');
          return;
        }

        // Track presence
        await addUser(projectId, user);

        handleChatConnection(ws, user, projectId);

        // Clean up presence on disconnect
        ws.on('close', async () => {
          await removeUser(projectId, user.id);
        });

      } else if (pathname.startsWith('/ws/presence/')) {
        const projectId = pathname.replace('/ws/presence/', '');
        if (!projectId) {
          ws.close(4002, 'Project ID is required.');
          return;
        }

        // Track presence
        await addUser(projectId, user);

        // Send confirmation
        ws.send(JSON.stringify({
          type: 'presence:connected',
          data: {
            userId: user.id,
            username: user.username,
            projectId,
          },
        }));

        // Handle presence-specific messages (cursor updates, etc.)
        ws.on('message', async (rawData) => {
          try {
            const payload = JSON.parse(rawData.toString());

            if (payload.type === 'presence:cursor') {
              const { updateCursor } = await import('../services/presenceService.js');
              await updateCursor(projectId, user.id, payload.data);

              // Broadcast cursor to other clients
              wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === client.OPEN) {
                  client.send(JSON.stringify({
                    type: 'presence:cursor',
                    data: {
                      userId: user.id,
                      username: user.username,
                      ...payload.data,
                    },
                  }));
                }
              });
            }
          } catch (error) {
            console.error('Presence message error:', error.message);
          }
        });

        // Clean up on disconnect
        ws.on('close', async () => {
          await removeUser(projectId, user.id);

          // Notify others of disconnect
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === client.OPEN) {
              client.send(JSON.stringify({
                type: 'presence:disconnected',
                data: {
                  userId: user.id,
                  username: user.username,
                },
              }));
            }
          });
        });

      } else {
        ws.close(4004, 'Unknown WebSocket path.');
      }

    } catch (error) {
      console.error('WebSocket connection error:', error.message);
      ws.close(4000, 'Internal server error.');
    }
  });

  wss.on('error', (error) => {
    console.error('Main WebSocket server error:', error.message);
  });

  console.log('🔌 Main WebSocket handler attached to HTTP server');

  return wss;
}

export default { setupWebSocket };
