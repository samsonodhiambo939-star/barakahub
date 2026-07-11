import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

export class PortalController {
  async dashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const [givingSummary, attendanceRecords, groupMembership, nextService, recentActivity] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, status: 'completed', reversalId: null, transactionDate: { gte: yearStart } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.attendance.findMany({
          where: { userId },
          orderBy: { checkInTime: 'desc' },
          take: 50,
          select: { id: true, checkInTime: true, service: { select: { name: true, date: true } } },
        }),
        prisma.groupMember.findFirst({
          where: { userId },
          include: {
            group: {
              select: { id: true, name: true, type: true, meetingDay: true, meetingTime: true, location: true, leader: { select: { id: true, firstName: true, lastName: true, phone: true } } },
            },
          },
        }),
        prisma.service.findFirst({
          where: { date: { gte: now }, deletedAt: null },
          orderBy: { date: 'asc' },
          select: { id: true, name: true, date: true, serviceType: true },
        }),
        prisma.transaction.findMany({
          where: { userId, status: 'completed' },
          orderBy: { transactionDate: 'desc' },
          take: 10,
          select: { id: true, amount: true, transactionDate: true, category: { select: { name: true } } },
        }),
      ]);

      const totalAttendance = attendanceRecords.length;
      const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterlyAttendance = attendanceRecords.filter(a => new Date(a.checkInTime) >= thisQuarterStart).length;

      const lastGift = recentActivity[0];

      res.json({
        givingYtd: givingSummary._sum.amount || 0,
        givingCount: givingSummary._count,
        lastGift: lastGift ? { amount: lastGift.amount, date: lastGift.transactionDate, category: lastGift.category.name } : null,
        attendance: {
          total: totalAttendance,
          quarterly: quarterlyAttendance,
          quarterStart: thisQuarterStart.toISOString(),
          lastFive: attendanceRecords.slice(0, 5).map(a => ({ id: a.id, date: a.checkInTime, service: a.service?.name })),
        },
        group: groupMembership ? {
          id: groupMembership.group.id,
          name: groupMembership.group.name,
          type: groupMembership.group.type,
          meetingDay: groupMembership.group.meetingDay,
          meetingTime: groupMembership.group.meetingTime,
          location: groupMembership.group.location,
          leader: groupMembership.group.leader,
        } : null,
        nextService: nextService ? { id: nextService.id, name: nextService.name, date: nextService.date, type: nextService.serviceType } : null,
        recentActivity: recentActivity.map(t => ({ type: 'giving', amount: t.amount, date: t.transactionDate, category: t.category.name })),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const allowed = ['phone', 'email', 'physicalAddress', 'estate', 'photoUrl'];
      const updates: any = {};
      for (const field of allowed) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updates,
        select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, email: true, estate: true, physicalAddress: true, photoUrl: true },
      });

      await prisma.auditLog.create({
        data: { userId, action: 'PROFILE_UPDATE', table: 'User', recordId: userId, newValues: JSON.stringify(updates) },
      });

      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });

      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

      await prisma.auditLog.create({
        data: { userId: user.id, action: 'PASSWORD_CHANGE', table: 'User', recordId: user.id },
      });

      res.json({ message: 'Password updated' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const portalController = new PortalController();
