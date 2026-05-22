import api from './api';

const aiService = {
  /**
   * Debug code — send code and error context for AI analysis.
   */
  async debugCode(projectId, code, error, language, fileId) {
    return api.post('/ai/debug', {
      projectId,
      code,
      error: error || '',
      language: language || 'javascript',
      fileId: fileId || null,
    });
  },

  /**
   * Explain selected code.
   */
  async explainCode(projectId, code, language) {
    return api.post('/ai/explain', {
      projectId,
      code,
      language: language || 'javascript',
    });
  },

  /**
   * Get code suggestions at a cursor position.
   */
  async suggestCode(projectId, code, cursorPosition, language) {
    return api.post('/ai/suggest', {
      projectId,
      code,
      cursorPosition: cursorPosition || { line: 1, column: 1 },
      language: language || 'javascript',
    });
  },

  /**
   * Chat with the AI assistant.
   */
  async chat(projectId, message, fileId, conversationId) {
    return api.post('/ai/chat', {
      projectId,
      message,
      fileId: fileId || null,
      conversationId: conversationId || null,
    });
  },

  /**
   * Get all AI conversations for a project.
   */
  async getConversations(projectId) {
    return api.get(`/ai/conversations/${projectId}`);
  },

  /**
   * Get the message history for a specific conversation.
   */
  async getConversationHistory(conversationId) {
    return api.get(`/ai/conversations/${conversationId}/history`);
  },
};

export default aiService;
