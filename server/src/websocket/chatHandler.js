import { query, isMemoryMode } from '../config/database.js';

/** Active chat rooms: Map<projectId, Set<WebSocket>> */
const chatRooms = new Map();

/** In-memory chat messages (for memory mode where SQL JOINs don't work) */
const memChatMessages = new Map(); // projectId -> Array<message>

/**
 * Gets or creates a chat room for a project.
 * @param {string} projectId - The project UUID.
 * @returns {Set<import('ws').WebSocket>} The set of connected WebSocket clients.
 */
function getRoom(projectId) {
  if (!chatRooms.has(projectId)) {
    chatRooms.set(projectId, new Set());
  }
  return chatRooms.get(projectId);
}

/**
 * Broadcasts a message to all clients in a room, optionally excluding the sender.
 * @param {string} projectId - The project UUID.
 * @param {Object} message - The message payload to broadcast.
 * @param {import('ws').WebSocket} [excludeWs=null] - Optional WebSocket to exclude.
 */
function broadcastToRoom(projectId, message, excludeWs = null) {
  const room = chatRooms.get(projectId);
  if (!room) return;

  const data = JSON.stringify(message);

  for (const client of room) {
    if (client !== excludeWs && client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

/**
 * Stores a chat message.
 */
async function storeMessage(projectId, userId, username, content) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const timestamp = new Date().toISOString();

  // Store in our in-memory chat store (always, as fallback for JOINs)
  if (!memChatMessages.has(projectId)) {
    memChatMessages.set(projectId, []);
  }
  const msg = { id, project_id: projectId, user_id: userId, username, content, created_at: timestamp };
  memChatMessages.get(projectId).push(msg);

  // Also try SQL storage (works in PostgreSQL mode)
  if (!isMemoryMode()) {
    try {
      await query(
        `INSERT INTO chat_messages (project_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
        [projectId, userId, content]
      );
    } catch (err) {
      console.error('Failed to persist chat message to DB:', err.message);
    }
  }

  return msg;
}

/**
 * Gets recent chat messages for a project.
 */
async function getRecentMessages(projectId, limit = 50) {
  // Use in-memory store (always works, regardless of DB mode)
  const msgs = memChatMessages.get(projectId) || [];
  return msgs.slice(-limit);
}

/**
 * Handles a new chat WebSocket connection.
 * @param {import('ws').WebSocket} ws - The WebSocket connection.
 * @param {Object} user - The authenticated user.
 * @param {string} user.id - User UUID.
 * @param {string} user.username - Username.
 * @param {string} projectId - The project UUID.
 */
export function handleChatConnection(ws, user, projectId) {
  const room = getRoom(projectId);
  room.add(ws);

  // Attach metadata to the WebSocket
  ws.userId = user.id;
  ws.username = user.username;
  ws.projectId = projectId;

  console.log(`💬 Chat: ${user.username} joined project ${projectId} (${room.size} users)`);

  // Send recent messages to the newly connected user
  getRecentMessages(projectId)
    .then((messages) => {
      ws.send(JSON.stringify({
        type: 'chat:history',
        data: { messages },
      }));
    })
    .catch((err) => {
      console.error('Failed to load chat history:', err.message);
    });

  // Broadcast user joined
  broadcastToRoom(projectId, {
    type: 'chat:user_joined',
    data: {
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString(),
    },
  }, ws);

  // Handle incoming messages
  ws.on('message', async (rawData) => {
    try {
      const payload = JSON.parse(rawData.toString());

      switch (payload.type) {
        case 'chat:send': {
          const { content } = payload.data || {};
          if (!content || typeof content !== 'string' || content.trim().length === 0) {
            ws.send(JSON.stringify({
              type: 'chat:error',
              data: { message: 'Message content is required.' },
            }));
            return;
          }

          const trimmedContent = content.trim().substring(0, 2000); // Max 2000 chars

          // Store in DB
          const storedMessage = await storeMessage(projectId, user.id, user.username, trimmedContent);

          // Broadcast to room (including sender for confirmation)
          const broadcastPayload = {
            type: 'chat:message',
            data: {
              id: storedMessage.id,
              content: trimmedContent,
              userId: user.id,
              username: user.username,
              timestamp: storedMessage.created_at,
            },
          };

          broadcastToRoom(projectId, broadcastPayload);
          break;
        }

        case 'chat:typing': {
          // Broadcast typing indicator to others
          broadcastToRoom(projectId, {
            type: 'chat:typing',
            data: {
              userId: user.id,
              username: user.username,
              isTyping: payload.data?.isTyping ?? true,
            },
          }, ws);
          break;
        }

        default:
          ws.send(JSON.stringify({
            type: 'chat:error',
            data: { message: `Unknown message type: ${payload.type}` },
          }));
      }
    } catch (error) {
      console.error('Chat message handling error:', error.message);
      ws.send(JSON.stringify({
        type: 'chat:error',
        data: { message: 'Failed to process message.' },
      }));
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    room.delete(ws);

    console.log(`💬 Chat: ${user.username} left project ${projectId} (${room.size} users)`);

    // Broadcast user left
    broadcastToRoom(projectId, {
      type: 'chat:user_left',
      data: {
        userId: user.id,
        username: user.username,
        timestamp: new Date().toISOString(),
      },
    });

    // Clean up empty rooms
    if (room.size === 0) {
      chatRooms.delete(projectId);
    }
  });

  ws.on('error', (error) => {
    console.error(`Chat WebSocket error (${user.username}):`, error.message);
  });
}

export default { handleChatConnection };
