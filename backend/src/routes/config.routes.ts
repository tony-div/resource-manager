import { Router } from 'express';
import { configController } from '../controllers/config.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => configController.getConfig(req, res, next));
router.put('/', requireAdmin, (req, res, next) =>
  configController.updateConfig(req, res, next)
);

export default router;
