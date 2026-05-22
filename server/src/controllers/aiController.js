/**
 * @module controllers/aiController
 * @description AI controller handling code analysis, explanation, suggestion, and chat operations.
 */

import { aiService } from '../services/aiService.js';
import { buildContext } from '../services/contextBuilder.js';
import AIConversation from '../models/AIConversation.js';
import File from '../models/File.js';
import Project from '../models/Project.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Debugs code by analyzing for bugs and suggesting fixes.
 * @param {import('express').Request} req - Request with { code, error, language, fileId, projectId } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function debugCode(req, res, next) {
  try {
    const { code, error, language, fileId, projectId } = req.body;

    if (!code) {
      throw new AppError('Code is required for debugging.', 400, 'VALIDATION_ERROR');
    }

    if (!projectId) {
      throw new AppError('Project ID is required.', 400, 'VALIDATION_ERROR');
    }

    // Check access
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    // Build context from project files
    const context = await buildContext(projectId, fileId);

    const result = await aiService.debugCode(code, error || '', language || 'javascript', context);

    res.json({
      success: true,
      data: { analysis: result },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Explains the given code snippet.
 * @param {import('express').Request} req - Request with { code, language, projectId } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function explainCode(req, res, next) {
  try {
    const { code, language, projectId } = req.body;

    if (!code) {
      throw new AppError('Code is required for explanation.', 400, 'VALIDATION_ERROR');
    }

    if (!projectId) {
      throw new AppError('Project ID is required.', 400, 'VALIDATION_ERROR');
    }

    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    const result = await aiService.explainCode(code, language || 'javascript');

    res.json({
      success: true,
      data: { explanation: result },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Suggests code completions based on cursor position and context.
 * @param {import('express').Request} req - Request with { code, cursorPosition, language, fileId, projectId } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function suggestCode(req, res, next) {
  try {
    const { code, cursorPosition, language, fileId, projectId } = req.body;

    if (!code) {
      throw new AppError('Code is required for suggestions.', 400, 'VALIDATION_ERROR');
    }

    if (!projectId) {
      throw new AppError('Project ID is required.', 400, 'VALIDATION_ERROR');
    }

    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    const context = await buildContext(projectId, fileId);

    const result = await aiService.suggestCode(code, cursorPosition || 0, language || 'javascript', context);

    res.json({
      success: true,
      data: { suggestions: result },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Contextual AI chat for a specific file/project.
 * @param {import('express').Request} req - Request with { message, conversationId, fileId, projectId } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function chatWithAI(req, res, next) {
  try {
    const { message, conversationId, fileId, projectId } = req.body;

    if (!message) {
      throw new AppError('Message is required.', 400, 'VALIDATION_ERROR');
    }

    if (!projectId) {
      throw new AppError('Project ID is required.', 400, 'VALIDATION_ERROR');
    }

    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await AIConversation.findById(conversationId);
      if (!conversation) {
        // Fallback: If conversation was lost (e.g. DB reset), just create a new one
        console.warn(`Conversation ${conversationId} not found, creating a new one.`);
        conversation = await AIConversation.create(projectId, req.user.id, fileId || null);
      }
    } else {
      conversation = await AIConversation.create(projectId, req.user.id, fileId || null);
    }

    // Add user message
    await AIConversation.addMessage(conversation.id, 'user', message);

    // Get conversation history
    const history = await AIConversation.getHistory(conversation.id);

    // Build code context
    let codeContext = '';
    if (fileId) {
      const file = await File.findById(fileId);
      if (file) {
        codeContext = `Current file: ${file.name} (${file.language})\n\`\`\`${file.language}\n${file.content}\n\`\`\``;
      }
    }

    // Format messages for AI
    const messages = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = await aiService.chat(messages, codeContext);

    // Save assistant response
    await AIConversation.addMessage(conversation.id, 'assistant', result);

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        response: result,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists all AI conversations for a project and user.
 * @param {import('express').Request} req - Request with projectId param.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getConversations(req, res, next) {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      throw new AppError('Project ID is required.', 400, 'VALIDATION_ERROR');
    }

    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    const conversations = await AIConversation.findByProject(projectId, req.user.id);

    res.json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets the message history for a specific AI conversation.
 * @param {import('express').Request} req - Request with conversationId param.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getConversationHistory(req, res, next) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      throw new AppError('Conversation ID is required.', 400, 'VALIDATION_ERROR');
    }

    const conversation = await AIConversation.findById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
    }

    const messages = await AIConversation.getHistory(conversationId);

    res.json({
      success: true,
      data: { conversationId, messages },
    });
  } catch (error) {
    next(error);
  }
}
