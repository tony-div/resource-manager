import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => reservationController.findAll(req, res, next));
router.post('/', (req, res, next) => reservationController.create(req, res, next));
router.get('/:id', (req, res, next) => reservationController.findById(req, res, next));
router.put('/:id', (req, res, next) => reservationController.update(req, res, next));
router.delete('/:id', (req, res, next) => reservationController.delete(req, res, next));
router.post('/:id/return', requireAdmin, (req, res, next) =>
  reservationController.markReturned(req, res, next)
);

export default router;
