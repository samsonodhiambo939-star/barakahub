import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from './auth.routes';
import memberRoutes from './member.routes';
import financeRoutes from './finance.routes';
import attendanceRoutes from './attendance.routes';
import groupRoutes from './group.routes';
import followupRoutes from './followup.routes';
import communicationRoutes from './communication.routes';

const router = Router();
const _prisma = new PrismaClient();

// Health check (must be first, before auth middleware)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/debug/db', async (_req, res) => {
  try {
    await _prisma.$connect();
    const tables = await _prisma.$queryRawUnsafe('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'') as { table_name: string }[];
    await _prisma.$disconnect();
    res.json({ dbConnected: true, tables: tables.map(t => t.table_name) });
  } catch (e: unknown) {
    res.json({ dbConnected: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.all('/debug/echo', (req, res) => {
  res.json({ method: req.method, body: req.body, contentType: req.headers['content-type'], hasJsonParser: typeof req.body === 'object' });
});

router.get('/debug/error', (req, res) => {
  throw new Error('test error from handler');
});

router.get('/debug/users', async (_req, res) => {
  try {
    const users = await _prisma.user.findMany({ take: 5 });
    res.json({ userCount: users.length, users: users.map((u: { id: number; firstName: string; lastName: string; phone: string; role: string }) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, phone: u.phone, role: u.role })) });
  } catch (e: unknown) {
    res.json({ userError: e instanceof Error ? e.message : String(e) });
  }
});

router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/finance', financeRoutes);
router.use('/', attendanceRoutes);
router.use('/groups', groupRoutes);
router.use('/followups', followupRoutes);
router.use('/', communicationRoutes);

export default router;
