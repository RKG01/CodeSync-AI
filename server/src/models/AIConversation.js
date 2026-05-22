/**
 * @module models/AIConversation
 * @description AIConversation model for managing AI chat conversations.
 */

import { query } from '../config/database.js';

/**
 * AIConversation model class providing static methods for AI conversation management.
 */
class AIConversation {
  /**
   * Creates a new AI conversation.
   * @param {string} projectId - The project UUID.
   * @param {string} userId - The user UUID.
   * @param {string|null} [fileId=null] - Optional file UUID for file-scoped conversations.
   * @returns {Promise<Object>} The created conversation record.
   */
  static async create(projectId, userId, fileId = null) {
    const result = await query(
      `INSERT INTO ai_conversations (project_id, user_id, file_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, userId, fileId]
    );

    return result.rows[0];
  }

  /**
   * Finds a conversation by its ID, including message count.
   * @param {string} id - The conversation UUID.
   * @returns {Promise<Object|null>} The conversation or null.
   */
  static async findById(id) {
    const result = await query(
      `SELECT ac.*,
              (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ac.id) AS message_count
       FROM ai_conversations ac
       WHERE ac.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Finds conversations for a specific file and user.
   * @param {string} fileId - The file UUID.
   * @param {string} userId - The user UUID.
   * @returns {Promise<Array<Object>>} Array of conversation records.
   */
  static async findByFile(fileId, userId) {
    const result = await query(
      `SELECT ac.*,
              (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ac.id) AS message_count
       FROM ai_conversations ac
       WHERE ac.file_id = $1 AND ac.user_id = $2
       ORDER BY ac.updated_at DESC`,
      [fileId, userId]
    );

    return result.rows;
  }

  /**
   * Adds a message to a conversation.
   * @param {string} id - The conversation UUID.
   * @param {string} role - Message role ('user', 'assistant', or 'system').
   * @param {string} content - Message content.
   * @returns {Promise<Object>} The created message record.
   */
  static async addMessage(id, role, content) {
    const result = await query(
      `INSERT INTO ai_messages (conversation_id, role, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, role, content]
    );

    // Update conversation timestamp
    await query(
      `UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  /**
   * Gets the full message history for a conversation.
   * @param {string} id - The conversation UUID.
   * @returns {Promise<Array<Object>>} Array of messages ordered chronologically.
   */
  static async getHistory(id) {
    const result = await query(
      `SELECT id, conversation_id, role, content, created_at
       FROM ai_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    return result.rows;
  }

  /**
   * Finds all conversations for a project and user.
   * @param {string} projectId - The project UUID.
   * @param {string} userId - The user UUID.
   * @returns {Promise<Array<Object>>} Array of conversation records.
   */
  static async findByProject(projectId, userId) {
    const result = await query(
      `SELECT ac.*,
              f.name AS file_name, f.path AS file_path,
              (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ac.id) AS message_count
       FROM ai_conversations ac
       LEFT JOIN files f ON ac.file_id = f.id
       WHERE ac.project_id = $1 AND ac.user_id = $2
       ORDER BY ac.updated_at DESC`,
      [projectId, userId]
    );

    return result.rows;
  }
}

export default AIConversation;
