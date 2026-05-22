/**
 * @module models/File
 * @description File model with static methods for file tree CRUD operations.
 */

import { query, getClient, isMemoryMode } from '../config/database.js';

/**
 * File model class providing static methods for file/directory operations.
 */
class File {
  /**
   * Creates a new file or directory.
   * @param {string} projectId - The project UUID.
   * @param {string} path - The file path within the project (e.g., "src/index.js").
   * @param {string} name - The file or directory name.
   * @param {boolean} [isDirectory=false] - Whether this is a directory.
   * @param {string} [content=''] - File content (empty for directories).
   * @param {string} [language='plaintext'] - Programming language of the file.
   * @param {string|null} [parentId=null] - UUID of the parent directory.
   * @returns {Promise<Object>} The created file record.
   */
  static async create(projectId, path, name, isDirectory = false, content = '', language = 'plaintext', parentId = null) {
    const result = await query(
      `INSERT INTO files (project_id, path, name, is_directory, content, language, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [projectId, path, name, isDirectory, content, language, parentId]
    );

    return result.rows[0];
  }

  /**
   * Finds a file by its ID.
   * @param {string} id - The file UUID.
   * @returns {Promise<Object|null>} The file or null.
   */
  static async findById(id) {
    const result = await query(
      `SELECT * FROM files WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Finds all files for a project, returning a flat list ordered for tree building.
   * @param {string} projectId - The project UUID.
   * @returns {Promise<Array<Object>>} Array of file records ordered by path.
   */
  static async findByProject(projectId) {
    const result = await query(
      `SELECT id, project_id, path, name, is_directory, language, parent_id, created_at, updated_at
       FROM files
       WHERE project_id = $1
       ORDER BY is_directory DESC, path ASC`,
      [projectId]
    );

    return result.rows;
  }

  /**
   * Updates a file's fields.
   * @param {string} id - The file UUID.
   * @param {Object} data - Fields to update.
   * @param {string} [data.content] - New file content.
   * @param {string} [data.name] - New file name.
   * @param {string} [data.path] - New file path.
   * @param {string} [data.language] - New language.
   * @returns {Promise<Object|null>} The updated file or null.
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.path !== undefined) {
      fields.push(`path = $${paramIndex++}`);
      values.push(data.path);
    }
    if (data.language !== undefined) {
      fields.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }

    if (fields.length === 0) {
      return File.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE files SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Deletes a file or directory. If it's a directory, cascade deletes all children.
   * @param {string} id - The file UUID.
   * @returns {Promise<boolean>} True if the file was deleted.
   */
  static async delete(id) {
    if (isMemoryMode()) {
      const { tables } = await import('../config/memoryDb.js');
      // Collect all IDs to delete (recursive children)
      const idsToDelete = new Set();
      function collect(parentId) {
        idsToDelete.add(parentId);
        tables.files.filter(f => f.parent_id === parentId).forEach(f => collect(f.id));
      }
      collect(id);
      tables.files = tables.files.filter(f => !idsToDelete.has(f.id));
      return true;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `WITH RECURSIVE children AS (
           SELECT id FROM files WHERE id = $1
           UNION ALL
           SELECT f.id FROM files f INNER JOIN children c ON f.parent_id = c.id
         )
         DELETE FROM files WHERE id IN (SELECT id FROM children)`,
        [id]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds a file by its path within a project.
   * @param {string} projectId - The project UUID.
   * @param {string} path - The file path.
   * @returns {Promise<Object|null>} The file or null.
   */
  static async findByPath(projectId, path) {
    const result = await query(
      `SELECT * FROM files WHERE project_id = $1 AND path = $2`,
      [projectId, path]
    );

    return result.rows[0] || null;
  }

  /**
   * Builds a nested file tree structure from a flat list of files.
   * @param {Array<Object>} files - Flat array of file records.
   * @returns {Array<Object>} Nested tree structure.
   */
  static buildTree(files) {
    const map = new Map();
    const roots = [];

    // Index all files by ID
    for (const file of files) {
      map.set(file.id, { ...file, children: [] });
    }

    // Build tree
    for (const file of files) {
      const node = map.get(file.id);
      if (file.parent_id && map.has(file.parent_id)) {
        map.get(file.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}

export default File;
