/**
 * @module server
 * @description Entry point for the CodeSync AI server.
 * Creates HTTP server from Express app, starts Yjs WebSocket server,
 * and attaches the main WebSocket handler. Includes graceful shutdown.
 */

import { createServer } from 'http';
import env, { validateEnv } from './src/config/env.js';
import { testConnection, closePool } from './src/config/database.js';
import { connectRedis, disconnectRedis } from './src/config/redis.js';
import app from './src/app.js';
import { createYjsServer, shutdownYjs } from './src/websocket/yjsProvider.js';
import { setupWebSocket } from './src/websocket/wsHandler.js';

// ─── Validate Environment ───────────────────────────────────────────────────
validateEnv();

// ─── Create HTTP Server ─────────────────────────────────────────────────────
const httpServer = createServer(app);

// ─── Yjs WebSocket Server Reference ─────────────────────────────────────────
let yjsWss = null;
let mainWss = null;

/**
 * Starts all servers and services.
 * @returns {Promise<void>}
 */
async function start() {
  try {
    // Connect to PostgreSQL (falls back to in-memory if unavailable)
    await testConnection();

    // Connect to Redis (non-fatal if unavailable)
    try {
      await connectRedis();
    } catch (err) {
      console.warn('⚠️  Redis unavailable — continuing without caching/presence.');
    }

    // Start Yjs WebSocket server on its own port
    yjsWss = createYjsServer(env.YJS_PORT);

    // Attach main WebSocket handler (chat + presence) to HTTP server
    mainWss = setupWebSocket(httpServer);

    // Start Express HTTP server
    httpServer.listen(env.PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════');
      console.log('  🚀 CodeSync AI Server');
      console.log('═══════════════════════════════════════════════');
      console.log(`  📡 HTTP API:      http://localhost:${env.PORT}`);
      console.log(`  🔄 Yjs WebSocket: ws://localhost:${env.YJS_PORT}`);
      console.log(`  💬 Chat WS:       ws://localhost:${env.PORT}/ws/chat/:projectId`);
      console.log(`  👥 Presence WS:   ws://localhost:${env.PORT}/ws/presence/:projectId`);
      console.log(`  🏥 Health Check:  http://localhost:${env.PORT}/health`);
      console.log(`  🌍 Environment:   ${env.NODE_ENV}`);
      console.log('═══════════════════════════════════════════════');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

/**
 * Gracefully shuts down all services and exits.
 * @param {string} signal - The signal that triggered shutdown.
 */
async function gracefulShutdown(signal) {
  console.log(`\n⚡ ${signal} received. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Close Yjs WebSocket server
    if (yjsWss) {
      await shutdownYjs();
      yjsWss.close(() => {
        console.log('✅ Yjs WebSocket server closed');
      });
    }

    // Close main WebSocket server
    if (mainWss) {
      mainWss.close(() => {
        console.log('✅ Main WebSocket server closed');
      });
    }

    // Close database connections
    await closePool();

    // Close Redis connection
    await disconnectRedis();

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const msg = `[${new Date().toISOString()}] UNCAUGHT: ${error.message}\n${error.stack}\n\n`;
  import('fs').then(fs => fs.appendFileSync('./crash.log', msg));
  console.error('🔥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  const msg = `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason?.message || reason}\n${reason?.stack || ''}\n\n`;
  import('fs').then(fs => fs.appendFileSync('./crash.log', msg));
  console.error('🔥 Unhandled Rejection:', reason);
});

// ─── Start Server ────────────────────────────────────────────────────────────
start();
