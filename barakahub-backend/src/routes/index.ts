import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
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

// One-time setup for fresh database
router.post('/setup', async (_req, res) => {
  const prisma = new PrismaClient();
  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      await prisma.$disconnect();
      return res.status(400).json({ error: 'Database already seeded' });
    }

    const adminPassword = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        memberNo: 'CHC-0001',
        firstName: 'Super',
        lastName: 'Admin',
        phone: '254700000000',
        email: 'admin@barakahub.org',
        idNumber: '12345678',
        gender: 'male' as any,
        maritalStatus: 'single' as any,
        role: 'admin' as any,
        passwordHash: adminPassword,
      },
    });

    const categories = [
      { name: 'Tithe', description: 'Biblical tithe - 10% of income', sortOrder: 1 },
      { name: 'Offering', description: 'General offering', sortOrder: 2 },
      { name: 'Thanksgiving', description: 'Special thanksgiving', sortOrder: 3 },
      { name: 'Building Fund', description: 'Church building/construction fund', sortOrder: 4 },
      { name: 'Missions', description: 'Missionary support', sortOrder: 5 },
      { name: 'Welfare', description: 'Benevolence and member welfare', sortOrder: 6 },
    ];
    for (const cat of categories) {
      await prisma.givingCategory.create({ data: cat as any });
    }

    const memberPassword = await bcrypt.hash('Member@123', 12);
    await prisma.user.create({
      data: {
        memberNo: 'CHC-0002',
        firstName: 'Jane',
        lastName: 'Wanjiku',
        phone: '254711111111',
        email: 'jane@example.com',
        idNumber: '87654321',
        gender: 'female' as any,
        dob: new Date('1995-06-15'),
        maritalStatus: 'married' as any,
        physicalAddress: '123 River Road',
        estate: 'South B',
        role: 'member' as any,
        passwordHash: memberPassword,
      },
    });

    await prisma.$disconnect();
    res.json({ message: 'Database seeded successfully' });
  } catch (e: unknown) {
    await prisma.$disconnect();
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
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
