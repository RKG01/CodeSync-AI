/**
 * @module app
 * @description Express application setup with middleware, routes, and error handling.
 */

import express, { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { runCode } from './controllers/codeRunController.js';
import { getFileTree, createFile, getFile, updateFile, deleteFile } from './controllers/fileController.js';

const app = express();

// Trust proxy is required when deployed behind a reverse proxy (like Render/Vercel)
// Without this, rate limiting will block everyone because it sees the proxy's IP.
app.set('trust proxy', 1);

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [env.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── General Rate Limiter ────────────────────────────────────────────────────
app.use(generalLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
/**
 * GET /health
 * Health check endpoint. Returns server status and timestamp.
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '1.0.0',
    },
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);

// Code execution route
app.post('/api/code/run', authenticate, runCode);

// Mount file routes also under /api/projects/:projectId/files for frontend compatibility

const projectFileRouter = Router({ mergeParams: true });
projectFileRouter.use(authenticate);
projectFileRouter.get('/', getFileTree);        // GET /api/projects/:projectId/files
projectFileRouter.post('/', createFile);         // POST /api/projects/:projectId/files
projectFileRouter.get('/:fileId', getFile);      // GET /api/projects/:projectId/files/:fileId
projectFileRouter.put('/:fileId', updateFile);   // PUT /api/projects/:projectId/files/:fileId
projectFileRouter.delete('/:fileId', deleteFile); // DELETE /api/projects/:projectId/files/:fileId
app.use('/api/projects/:projectId/files', projectFileRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
