import { Router } from 'express';
import authRoutes from './auth.routes';
import memberRoutes from './member.routes';
import financeRoutes from './finance.routes';
import attendanceRoutes from './attendance.routes';
import groupRoutes from './group.routes';
import followupRoutes from './followup.routes';
import communicationRoutes from './communication.routes';

const router = Router();

// Health check (must be first, before auth middleware)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/finance', financeRoutes);
router.use('/', attendanceRoutes);
router.use('/groups', groupRoutes);
router.use('/followups', followupRoutes);
router.use('/', communicationRoutes);

export default router;
