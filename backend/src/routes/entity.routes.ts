import { Router } from 'express';
import { entityController } from '../controllers/entity.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => entityController.findAll(req, res, next));
router.post('/', (req, res, next) => entityController.create(req, res, next));
router.get('/:id', (req, res, next) => entityController.findById(req, res, next));
router.put('/:id', (req, res, next) => entityController.update(req, res, next));
router.delete('/:id', requireAdmin, (req, res, next) => entityController.delete(req, res, next));

export default router;
