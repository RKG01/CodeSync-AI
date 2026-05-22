/**
 * @module models/Project
 * @description Project model with static methods for CRUD and collaboration operations.
 * Supports both PostgreSQL and in-memory database modes.
 */

import { query, getClient, isMemoryMode } from '../config/database.js';

// Direct access to memory tables when in demo mode
let memTables = null;
async function getTables() {
  if (!memTables) {
    const mod = await import('../config/memoryDb.js');
    memTables = mod.tables;
  }
  return memTables;
}

/**
 * Project model class providing static methods for project data operations.
 */
class Project {
  /**
   * Creates a new project.
   */
  static async create(name, description, language, ownerId) {
    const result = await query(
      `INSERT INTO projects (name, description, language, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, language, ownerId]
    );

    const project = result.rows[0];

    // Also add owner as collaborator in memory mode
    if (isMemoryMode()) {
      const tables = await getTables();
      tables.project_collaborators.push({
        project_id: project.id,
        user_id: ownerId,
        role: 'owner',
        joined_at: new Date(),
      });
    }

    return project;
  }

  /**
   * Finds a project by its ID, including owner info.
   */
  static async findById(id) {
    if (isMemoryMode()) {
      const tables = await getTables();
      const project = tables.projects.find(p => p.id === id);
      if (!project) return null;
      const owner = tables.users.find(u => u.id === project.owner_id);
      return {
        ...project,
        owner_username: owner?.username || 'unknown',
        owner_email: owner?.email || '',
      };
    }

    const result = await query(
      `SELECT p.*, u.username AS owner_username, u.email AS owner_email
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Finds all projects accessible by a user (owned + collaborated).
   */
  static async findByUser(userId) {
    if (isMemoryMode()) {
      const tables = await getTables();
      // Find projects where user is owner
      const ownedProjects = tables.projects.filter(p => p.owner_id === userId);
      // Find projects where user is collaborator
      const collabProjectIds = tables.project_collaborators
        .filter(pc => pc.user_id === userId)
        .map(pc => pc.project_id);
      const collabProjects = tables.projects.filter(
        p => collabProjectIds.includes(p.id) && p.owner_id !== userId
      );

      const allProjects = [...ownedProjects, ...collabProjects];

      return allProjects.map(p => {
        const owner = tables.users.find(u => u.id === p.owner_id);
        const isOwner = p.owner_id === userId;
        return {
          ...p,
          owner_username: owner?.username || 'unknown',
          user_role: isOwner ? 'owner' : 'editor',
        };
      }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    const result = await query(
      `SELECT DISTINCT p.*, u.username AS owner_username,
              CASE WHEN p.owner_id = $1 THEN 'owner'
                   ELSE pc.role
              END AS user_role
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       LEFT JOIN project_collaborators pc ON pc.project_id = p.id AND pc.user_id = $1
       WHERE p.owner_id = $1 OR pc.user_id = $1
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Updates a project's fields.
   */
  static async update(id, data) {
    if (isMemoryMode()) {
      const tables = await getTables();
      const idx = tables.projects.findIndex(p => p.id === id);
      if (idx === -1) return null;
      if (data.name !== undefined) tables.projects[idx].name = data.name;
      if (data.description !== undefined) tables.projects[idx].description = data.description;
      if (data.language !== undefined) tables.projects[idx].language = data.language;
      tables.projects[idx].updated_at = new Date();
      return tables.projects[idx];
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.language !== undefined) {
      fields.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }

    if (fields.length === 0) {
      return Project.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Deletes a project.
   */
  static async delete(id) {
    if (isMemoryMode()) {
      const tables = await getTables();
      const before = tables.projects.length;
      tables.projects = tables.projects.filter(p => p.id !== id);
      tables.files = tables.files.filter(f => f.project_id !== id);
      tables.project_collaborators = tables.project_collaborators.filter(pc => pc.project_id !== id);
      return tables.projects.length < before;
    }

    const result = await query(
      `DELETE FROM projects WHERE id = $1`,
      [id]
    );

    return result.rowCount > 0;
  }

  /**
   * Adds a collaborator to a project.
   */
  static async addCollaborator(projectId, userId, role = 'editor') {
    if (isMemoryMode()) {
      const tables = await getTables();
      // Remove existing if any
      tables.project_collaborators = tables.project_collaborators.filter(
        pc => !(pc.project_id === projectId && pc.user_id === userId)
      );
      const record = { project_id: projectId, user_id: userId, role, joined_at: new Date() };
      tables.project_collaborators.push(record);
      return record;
    }

    const result = await query(
      `INSERT INTO project_collaborators (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET role = $3, updated_at = NOW()
       RETURNING *`,
      [projectId, userId, role]
    );

    return result.rows[0];
  }

  /**
   * Removes a collaborator from a project.
   */
  static async removeCollaborator(projectId, userId) {
    if (isMemoryMode()) {
      const tables = await getTables();
      const before = tables.project_collaborators.length;
      tables.project_collaborators = tables.project_collaborators.filter(
        pc => !(pc.project_id === projectId && pc.user_id === userId)
      );
      return tables.project_collaborators.length < before;
    }

    const result = await query(
      `DELETE FROM project_collaborators
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    return result.rowCount > 0;
  }

  /**
   * Gets all collaborators for a project, including the owner.
   */
  static async getCollaborators(projectId) {
    if (isMemoryMode()) {
      const tables = await getTables();
      const project = tables.projects.find(p => p.id === projectId);
      if (!project) return [];

      const owner = tables.users.find(u => u.id === project.owner_id);
      const result = owner ? [{ id: owner.id, username: owner.username, email: owner.email, avatar_url: owner.avatar_url, role: 'owner' }] : [];

      const collabs = tables.project_collaborators.filter(
        pc => pc.project_id === projectId && pc.user_id !== project.owner_id
      );
      for (const pc of collabs) {
        const user = tables.users.find(u => u.id === pc.user_id);
        if (user) {
          result.push({ id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url, role: pc.role });
        }
      }

      return result;
    }

    const result = await query(
      `SELECT u.id, u.username, u.email, u.avatar_url, 'owner' AS role
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1
       UNION ALL
       SELECT u.id, u.username, u.email, u.avatar_url, pc.role
       FROM project_collaborators pc
       JOIN users u ON pc.user_id = u.id
       WHERE pc.project_id = $1`,
      [projectId]
    );

    return result.rows;
  }

  /**
   * Checks if a user has access to a project (owner or collaborator).
   */
  static async checkAccess(projectId, userId) {
    if (isMemoryMode()) {
      const tables = await getTables();
      // Check if owner
      const project = tables.projects.find(p => p.id === projectId);
      if (project && project.owner_id === userId) {
        return { role: 'owner' };
      }
      // Check if collaborator
      const collab = tables.project_collaborators.find(
        pc => pc.project_id === projectId && pc.user_id === userId
      );
      if (collab) {
        return { role: collab.role };
      }
      return null;
    }

    const result = await query(
      `SELECT 'owner' AS role FROM projects WHERE id = $1 AND owner_id = $2
       UNION ALL
       SELECT role FROM project_collaborators WHERE project_id = $1 AND user_id = $2
       LIMIT 1`,
      [projectId, userId]
    );

    return result.rows[0] || null;
  }
}

export default Project;
