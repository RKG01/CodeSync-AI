/**
 * @module routes/aiRoutes
 * @description AI feature routes. All routes require authentication and AI rate limiting.
 */

import { Router } from 'express';
import {
  debugCode,
  explainCode,
  suggestCode,
  chatWithAI,
  getConversations,
  getConversationHistory,
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All AI routes require authentication and AI-specific rate limiting
router.use(authenticate);
router.use(aiLimiter);

/**
 * POST /api/ai/debug
 * Analyzes code for bugs and suggests fixes.
 */
router.post('/debug', debugCode);

/**
 * POST /api/ai/explain
 * Explains what a code snippet does.
 */
router.post('/explain', explainCode);

/**
 * POST /api/ai/suggest
 * Suggests code completions based on context and cursor position.
 */
router.post('/suggest', suggestCode);

/**
 * POST /api/ai/chat
 * Contextual AI chat about code.
 */
router.post('/chat', chatWithAI);

/**
 * GET /api/ai/conversations/:projectId
 * Lists all AI conversations for a project and user.
 */
router.get('/conversations/:projectId', getConversations);

/**
 * GET /api/ai/conversations/:conversationId/history
 * Gets the message history for a specific conversation.
 */
router.get('/conversations/:conversationId/history', getConversationHistory);

export default router;
