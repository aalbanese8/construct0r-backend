import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as projectController from '../controllers/project.controller.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

router.get('/', projectController.getProjectsHandler);
router.get('/:id', projectController.getProjectHandler);
router.post('/', projectController.createProjectHandler);
router.put('/:id', projectController.updateProjectHandler);
router.delete('/:id', projectController.deleteProjectHandler);

export default router;
