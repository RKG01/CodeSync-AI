/**
 * @module controllers/projectController
 * @description Project controller handling CRUD operations and collaboration management.
 */

import Project from '../models/Project.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Creates a new project for the authenticated user.
 * @param {import('express').Request} req - Request with { name, description, language } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function createProject(req, res, next) {
  try {
    const { name, description, language } = req.body;

    if (!name) {
      throw new AppError('Project name is required.', 400, 'VALIDATION_ERROR');
    }

    const project = await Project.create(
      name,
      description || '',
      language || 'javascript',
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets all projects accessible by the authenticated user.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getProjects(req, res, next) {
  try {
    const projects = await Project.findByUser(req.user.id);

    res.json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets a single project by ID. Requires the user to have access.
 * @param {import('express').Request} req - Request with projectId param.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getProject(req, res, next) {
  try {
    const { projectId } = req.params;

    // Check access
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found.', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: { project, role: access.role },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a project. Only the owner can update.
 * @param {import('express').Request} req - Request with projectId param and update fields in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function updateProject(req, res, next) {
  try {
    const { projectId } = req.params;
    const { name, description, language } = req.body;

    // Check ownership
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found.', 404, 'NOT_FOUND');
    }

    if (project.owner_id !== req.user.id) {
      throw new AppError('Only the project owner can update the project.', 403, 'FORBIDDEN');
    }

    const updated = await Project.update(projectId, { name, description, language });

    res.json({
      success: true,
      data: { project: updated },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a project. Only the owner can delete.
 * @param {import('express').Request} req - Request with projectId param.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function deleteProject(req, res, next) {
  try {
    const { projectId } = req.params;

    // Check ownership
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found.', 404, 'NOT_FOUND');
    }

    if (project.owner_id !== req.user.id) {
      throw new AppError('Only the project owner can delete the project.', 403, 'FORBIDDEN');
    }

    await Project.delete(projectId);

    res.json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Invites a collaborator to a project by email or username.
 * Only the project owner can invite collaborators.
 * @param {import('express').Request} req - Request with projectId param and { email | username, role } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function inviteCollaborator(req, res, next) {
  try {
    const { projectId } = req.params;
    const { email, username, role } = req.body;

    if (!email && !username) {
      throw new AppError('Email or username of the collaborator is required.', 400, 'VALIDATION_ERROR');
    }

    // Check ownership
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found.', 404, 'NOT_FOUND');
    }

    console.log('InviteCollaborator debug:', { projectOwnerId: project.owner_id, reqUserId: req.user.id });
    if (project.owner_id !== req.user.id) {
      throw new AppError('Only the project owner can invite collaborators.', 403, 'FORBIDDEN');
    }

    // Find the user to invite
    let userToInvite;
    if (email) {
      userToInvite = await User.findByEmail(email);
    } else {
      userToInvite = await User.findByUsername(username);
    }

    if (!userToInvite) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (userToInvite.id === req.user.id) {
      throw new AppError('You cannot invite yourself.', 400, 'SELF_INVITE');
    }

    const collaborator = await Project.addCollaborator(
      projectId,
      userToInvite.id,
      role || 'editor'
    );

    res.status(201).json({
      success: true,
      data: {
        collaborator: {
          ...collaborator,
          username: userToInvite.username,
          email: userToInvite.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets all collaborators for a project.
 * @param {import('express').Request} req - Request with projectId param.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getCollaborators(req, res, next) {
  try {
    const { projectId } = req.params;

    // Check access
    const access = await Project.checkAccess(projectId, req.user.id);
    if (!access) {
      throw new AppError('Project not found or access denied.', 404, 'NOT_FOUND');
    }

    const collaborators = await Project.getCollaborators(projectId);

    res.json({
      success: true,
      data: { collaborators },
    });
  } catch (error) {
    next(error);
  }
}
