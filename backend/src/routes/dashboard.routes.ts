import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/stats', (req, res, next) => dashboardController.getStats(req, res, next));

export default router;
