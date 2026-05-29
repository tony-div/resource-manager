import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => inventoryController.findAll(req, res, next));
router.post('/', (req, res, next) => inventoryController.create(req, res, next));
router.get('/:id', (req, res, next) => inventoryController.findById(req, res, next));
router.put('/:id', (req, res, next) => inventoryController.update(req, res, next));
router.delete('/:id', requireAdmin, (req, res, next) => inventoryController.delete(req, res, next));

export default router;
