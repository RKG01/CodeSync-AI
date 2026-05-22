/**
 * @module routes/projectRoutes
 * @description Project CRUD and collaboration routes. All routes require authentication.
 */

import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  inviteCollaborator,
  getCollaborators,
} from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

/**
 * POST /api/projects
 * Creates a new project.
 */
router.post('/', createProject);

/**
 * GET /api/projects
 * Gets all projects accessible by the authenticated user.
 */
router.get('/', getProjects);

/**
 * GET /api/projects/:projectId
 * Gets a single project by ID.
 */
router.get('/:projectId', getProject);

/**
 * PUT /api/projects/:projectId
 * Updates a project (owner only).
 */
router.put('/:projectId', updateProject);

/**
 * DELETE /api/projects/:projectId
 * Deletes a project (owner only).
 */
router.delete('/:projectId', deleteProject);

/**
 * POST /api/projects/:projectId/collaborators
 * Invites a collaborator to a project (owner only).
 */
router.post('/:projectId/collaborators', inviteCollaborator);

/**
 * GET /api/projects/:projectId/collaborators
 * Gets all collaborators for a project.
 */
router.get('/:projectId/collaborators', getCollaborators);

export default router;
