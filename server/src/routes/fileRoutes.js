/**
 * @module routes/fileRoutes
 * @description File CRUD routes. All routes require authentication.
 */

import { Router } from 'express';
import {
  getFileTree,
  createFile,
  getFile,
  updateFile,
  deleteFile,
} from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All file routes require authentication
router.use(authenticate);

/**
 * GET /api/files/:projectId/tree
 * Gets the complete file tree for a project.
 */
router.get('/:projectId/tree', getFileTree);

/**
 * POST /api/files/:projectId
 * Creates a new file or directory in a project.
 */
router.post('/:projectId', createFile);

/**
 * GET /api/files/:projectId/:fileId
 * Gets a single file with its content.
 */
router.get('/:projectId/:fileId', getFile);

/**
 * PUT /api/files/:projectId/:fileId
 * Updates a file's content or metadata.
 */
router.put('/:projectId/:fileId', updateFile);

/**
 * DELETE /api/files/:projectId/:fileId
 * Deletes a file or directory (cascade deletes children).
 */
router.delete('/:projectId/:fileId', deleteFile);

export default router;
