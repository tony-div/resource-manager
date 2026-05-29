import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

export default router;
