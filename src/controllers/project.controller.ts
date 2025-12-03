import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as projectService from '../services/project.service.js';

export const getProjectsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projects = await projectService.getProjects(userId);
    return res.json(projects);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const getProjectHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    const project = await projectService.getProject(projectId, userId);
    return res.json(project);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
};

export const createProjectHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await projectService.createProject(userId, name);
    return res.status(201).json(project);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to create project' });
  }
};

export const updateProjectHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;
    const { name, nodes, edges } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (nodes !== undefined) updates.nodes = nodes;
    if (edges !== undefined) updates.edges = edges;

    const project = await projectService.updateProject(projectId, userId, updates);
    return res.json(project);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to update project' });
  }
};

export const deleteProjectHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.id;

    await projectService.deleteProject(projectId, userId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to delete project' });
  }
};
