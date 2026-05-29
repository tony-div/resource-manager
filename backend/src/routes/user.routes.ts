import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', requireAdmin, (req, res, next) => userController.findAll(req, res, next));
router.post('/', requireAdmin, (req, res, next) => userController.create(req, res, next));
router.get('/:id', requireAdmin, (req, res, next) => userController.findById(req, res, next));
router.put('/:id', requireAdmin, (req, res, next) => userController.update(req, res, next));
router.delete('/:id', requireAdmin, (req, res, next) => userController.delete(req, res, next));

export default router;
