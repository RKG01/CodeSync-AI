/**
 * @module controllers/fileController
 * @description File controller handling file tree operations, CRUD, and content retrieval.
 */

import File from '../models/File.js';
import Project from '../models/Project.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Gets the complete file tree for a project.
 * @param {import('express').Request} req - Request with projectId param.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getFileTree(req, res, next) {
  try {
    const { projectId } = req.params;

    // Check access
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    const files = await File.findByProject(projectId);
    const tree = File.buildTree(files);

    res.json({
      success: true,
      data: { tree, files },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a new file or directory within a project.
 * @param {import('express').Request} req - Request with projectId param and file data in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function createFile(req, res, next) {
  try {
    const { projectId } = req.params;
    const { path, name, isDirectory, content, language, parentId } = req.body;

    if (!path || !name) {
      throw new AppError('File path and name are required.', 400, 'VALIDATION_ERROR');
    }

    // Check access (need editor or owner role)
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }
    if (access.role === 'viewer') {
      throw new AppError('Viewers cannot create files.', 403, 'FORBIDDEN');
    }

    // Check if file already exists at this path
    const existing = await File.findByPath(projectId, path);
    if (existing) {
      throw new AppError('A file already exists at this path.', 409, 'DUPLICATE_PATH');
    }

    const file = await File.create(
      projectId,
      path,
      name,
      isDirectory || false,
      content || '',
      language || 'plaintext',
      parentId || null
    );

    res.status(201).json({
      success: true,
      data: { file },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets a single file with its content.
 * @param {import('express').Request} req - Request with projectId and fileId params.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getFile(req, res, next) {
  try {
    const { projectId, fileId } = req.params;

    // Check access
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    const file = await File.findById(fileId);
    if (!file || file.project_id !== projectId) {
      throw new AppError('File not found.', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: { file },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a file's content or metadata.
 * @param {import('express').Request} req - Request with projectId and fileId params, update data in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function updateFile(req, res, next) {
  try {
    const { projectId, fileId } = req.params;
    const { content, name, path, language } = req.body;

    // Check access
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }
    if (access.role === 'viewer') {
      throw new AppError('Viewers cannot edit files.', 403, 'FORBIDDEN');
    }

    const file = await File.findById(fileId);
    if (!file || file.project_id !== projectId) {
      throw new AppError('File not found.', 404, 'NOT_FOUND');
    }

    const updated = await File.update(fileId, { content, name, path, language });

    res.json({
      success: true,
      data: { file: updated },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a file or directory (cascade deletes children).
 * @param {import('express').Request} req - Request with projectId and fileId params.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function deleteFile(req, res, next) {
  try {
    const { projectId, fileId } = req.params;

    // Check access
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }
    if (access.role === 'viewer') {
      throw new AppError('Viewers cannot delete files.', 403, 'FORBIDDEN');
    }

    const file = await File.findById(fileId);
    if (!file || file.project_id !== projectId) {
      throw new AppError('File not found.', 404, 'NOT_FOUND');
    }

    await File.delete(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}
