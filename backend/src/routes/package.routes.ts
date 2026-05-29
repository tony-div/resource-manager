import { Router } from 'express';
import { packageController } from '../controllers/package.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => packageController.findAll(req, res, next));
router.post('/', (req, res, next) => packageController.create(req, res, next));
router.get('/:id', (req, res, next) => packageController.findById(req, res, next));
router.put('/:id', (req, res, next) => packageController.update(req, res, next));
router.delete('/:id', requireAdmin, (req, res, next) => packageController.delete(req, res, next));

export default router;
