/**
 * @module websocket/wsHandler
 * @description Main WebSocket connection handler. Authenticates connections via JWT
 * and routes to the appropriate handler (chat, presence, matchmaking, or duel)
 * based on the URL path.
 */

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { handleChatConnection } from './chatHandler.js';
import { addUser, removeUser } from '../services/presenceService.js';
import {
  joinQueue,
  leaveAllQueues,
  getQueueStats,
  onMatchFound,
  startMatchmaking,
} from '../services/matchmakingService.js';
import {
  createDuel,
  handleSubmission,
  handleDisconnect,
  getActiveDuel,
  attachPlayerWs,
} from '../services/duelEngine.js';
import User from '../models/User.js';
import Project from '../models/Project.js';

/**
 * Sets up the main WebSocket handler.
 * Handles WebSocket connections for:
 * - `/ws/chat/:projectId` — Real-time chat messaging
 * - `/ws/presence/:projectId` — Presence and cursor tracking
 * - `/ws/matchmaking` — Matchmaking queue for collab and duels
 * - `/ws/duel/:duelId` — Live duel communication
 *
 * @returns {WebSocketServer} The configured WebSocket server.
 */
export function setupWebSocket() {
  const wss = new WebSocketServer({
    noServer: true,
  });

  // ─── Matchmaking Match-Found Handler ────────────────────────────────────────
  onMatchFound(async (mode, p1Entry, p2Entry) => {
    if (mode === 'duel') {
      // Determine difficulty based on average Elo
      const avgElo = (p1Entry.elo + p2Entry.elo) / 2;
      let difficulty = 'medium';
      if (avgElo < 1100) difficulty = 'easy';
      else if (avgElo >= 1400) difficulty = 'hard';

      await createDuel(
        { userId: p1Entry.userId, username: p1Entry.username, elo: p1Entry.elo, ws: p1Entry.ws },
        { userId: p2Entry.userId, username: p2Entry.username, elo: p2Entry.elo, ws: p2Entry.ws },
        p1Entry.language,
        difficulty
      );
    } else if (mode === 'collab') {
      try {
        // Create a real shared project in the database
        const projectName = `Quick Match - ${p1Entry.language.toUpperCase()}`;
        const project = await Project.create(
          projectName,
          'A quick match collaborative session',
          p1Entry.language,
          p1Entry.userId
        );

        // Add player 2 as a collaborator
        await Project.addCollaborator(project.id, p2Entry.userId, 'editor');

        const matchPayload = {
          type: 'match:found',
          data: {
            mode: 'collab',
            roomId: project.id,
            language: p1Entry.language,
          },
        };

      if (p1Entry.ws?.readyState === p1Entry.ws?.OPEN) {
        p1Entry.ws.send(JSON.stringify({
          ...matchPayload,
          data: { ...matchPayload.data, opponent: { username: p2Entry.username } },
        }));
      }
      if (p2Entry.ws?.readyState === p2Entry.ws?.OPEN) {
        p2Entry.ws.send(JSON.stringify({
          ...matchPayload,
          data: { ...matchPayload.data, opponent: { username: p1Entry.username } },
        }));
      }
      } catch (err) {
        console.error('Error creating collab match:', err);
      }
    }
  });

  // Start the matchmaking ticker
  startMatchmaking();

  // ─── Connection Handler ─────────────────────────────────────────────────────
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

      // ─── Chat Handler ────────────────────────────────────────────────
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

      // ─── Presence Handler ──────────────────────────────────────────
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

      // ─── Matchmaking Handler ───────────────────────────────────────
      } else if (pathname === '/ws/matchmaking') {
        console.log(`🎯 Matchmaking WS: ${user.username} connected`);

        // Fetch full user profile for Elo info
        let fullUser;
        try {
          fullUser = await User.findById(user.id);
        } catch {
          fullUser = { ...user, elo_rating: 1000 };
        }

        // Send current queue stats
        ws.send(JSON.stringify({
          type: 'queue:stats',
          data: getQueueStats(),
        }));

        ws.on('message', async (rawData) => {
          try {
            const payload = JSON.parse(rawData.toString());

            switch (payload.type) {
              case 'queue:join': {
                const { mode, language } = payload.data || {};
                if (!mode || !language) {
                  ws.send(JSON.stringify({
                    type: 'queue:error',
                    data: { message: 'Mode and language are required.' },
                  }));
                  return;
                }

                const result = joinQueue(
                  mode,
                  { id: user.id, username: user.username, elo_rating: fullUser?.elo_rating || 1000 },
                  language,
                  ws
                );

                ws.send(JSON.stringify({
                  type: 'queue:joined',
                  data: {
                    mode,
                    language,
                    ...result,
                  },
                }));
                break;
              }

              case 'queue:leave': {
                leaveAllQueues(user.id);
                ws.send(JSON.stringify({
                  type: 'queue:left',
                  data: { message: 'Left all queues.' },
                }));
                break;
              }

              default:
                ws.send(JSON.stringify({
                  type: 'queue:error',
                  data: { message: `Unknown message type: ${payload.type}` },
                }));
            }
          } catch (error) {
            console.error('Matchmaking message error:', error.message);
          }
        });

        ws.on('close', () => {
          leaveAllQueues(user.id);
          console.log(`🎯 Matchmaking WS: ${user.username} disconnected`);
        });

      // ─── Duel Handler ──────────────────────────────────────────────
      } else if (pathname.startsWith('/ws/duel/')) {
        const duelId = pathname.replace('/ws/duel/', '');
        if (!duelId) {
          ws.close(4002, 'Duel ID is required.');
          return;
        }

        const duel = getActiveDuel(duelId);
        if (!duel) {
          ws.close(4004, 'Duel not found or already completed.');
          return;
        }

        // Attach the WS to the player in the duel
        const attached = attachPlayerWs(duelId, user.id, ws);
        if (!attached) {
          ws.close(4003, 'You are not a participant in this duel.');
          return;
        }

        console.log(`⚔️ Duel WS: ${user.username} connected to duel ${duelId}`);

        // Send current duel state
        ws.send(JSON.stringify({
          type: 'duel:state',
          data: {
            duelId,
            status: duel.status,
            language: duel.language,
            difficulty: duel.difficulty,
            player1: { userId: duel.player1.userId, username: duel.player1.username, elo: duel.player1.elo },
            player2: { userId: duel.player2.userId, username: duel.player2.username, elo: duel.player2.elo },
          },
        }));

        ws.on('message', async (rawData) => {
          try {
            const payload = JSON.parse(rawData.toString());

            switch (payload.type) {
              case 'duel:submit': {
                const { code } = payload.data || {};
                if (!code) {
                  ws.send(JSON.stringify({
                    type: 'duel:error',
                    data: { message: 'Code is required.' },
                  }));
                  return;
                }
                await handleSubmission(duelId, user.id, code);
                break;
              }

              case 'duel:forfeit': {
                console.log(`⚔️ Duel ${duelId}: ${user.username} forfeited`);
                const isP1 = duel.player1.userId === user.id;
                const winnerId = isP1 ? duel.player2.userId : duel.player1.userId;
                // Handle as disconnect/forfeit — the other player wins
                await handleDisconnect(duelId, user.id);
                break;
              }

              default:
                ws.send(JSON.stringify({
                  type: 'duel:error',
                  data: { message: `Unknown message type: ${payload.type}` },
                }));
            }
          } catch (error) {
            console.error('Duel message error:', error.message);
          }
        });

        ws.on('close', async () => {
          console.log(`⚔️ Duel WS: ${user.username} disconnected from duel ${duelId}`);
          await handleDisconnect(duelId, user.id);
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

  console.log('🔌 Main WebSocket handler attached (chat, presence, matchmaking, duel)');

  return wss;
}

export default { setupWebSocket };
