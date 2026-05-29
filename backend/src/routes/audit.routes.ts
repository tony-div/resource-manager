import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', (req, res, next) => auditController.findAll(req, res, next));

export default router;
