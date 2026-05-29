import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import entityRoutes from './entity.routes';
import inventoryRoutes from './inventory.routes';
import packageRoutes from './package.routes';
import reservationRoutes from './reservation.routes';
import configRoutes from './config.routes';
import dashboardRoutes from './dashboard.routes';
import auditRoutes from './audit.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/entities', entityRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/packages', packageRoutes);
router.use('/reservations', reservationRoutes);
router.use('/config', configRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
