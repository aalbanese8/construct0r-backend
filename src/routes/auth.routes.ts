import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/signup', authController.signupHandler);
router.post('/login', authController.loginHandler);
router.post('/google', authController.googleAuthHandler);

export default router;
