import { prisma } from '../utils/prisma';

export class FollowUpService {
  async create(data: {
    title: string;
    description?: string;
    trigger?: string;
    assignedTo: number;
    createdBy: number;
    groupId?: number;
    relatedUserId?: number;
    dueDate?: string;
  }) {
    return prisma.followUp.create({
      data: {
        title: data.title,
        description: data.description,
        trigger: (data.trigger as any) || 'manual',
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        groupId: data.groupId,
        relatedUserId: data.relatedUserId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(params: {
    status?: string;
    assignedTo?: number;
    trigger?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.trigger) where.trigger = params.trigger;

    const [items, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          assignedUser: { select: { id: true, firstName: true, lastName: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          group: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.followUp.count({ where }),
    ]);

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(id: number, status: string, notes?: string) {
    const data: any = { status };
    if (status === 'closed') data.closedAt = new Date();
    if (notes) data.notes = notes;

    return prisma.followUp.update({
      where: { id },
      data,
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getStats() {
    const [open, inProgress, closed, overdue] = await Promise.all([
      prisma.followUp.count({ where: { status: 'open' } }),
      prisma.followUp.count({ where: { status: 'in_progress' } }),
      prisma.followUp.count({ where: { status: 'closed' } }),
      prisma.followUp.count({
        where: { status: { notIn: ['closed'] }, dueDate: { lt: new Date() } },
      }),
    ]);

    return { open, inProgress, closed, overdue };
  }

  async autoCreateAbsenteeFollowUps() {
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    const services = await prisma.service.findMany({
      where: { date: { gte: threeWeeksAgo } },
      select: { id: true },
    });

    const serviceIds = services.map((s: any) => s.id);
    if (serviceIds.length === 0) return [];

    const presentUserIds = await prisma.attendance.findMany({
      where: { serviceId: { in: serviceIds } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const presentIds = presentUserIds.map((a: any) => a.userId);
    const absentees = await prisma.user.findMany({
      where: {
        id: { notIn: presentIds },
        isActive: true,
        status: 'active',
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const followUps = [];
    for (const absentee of absentees) {
      const existing = await prisma.followUp.findFirst({
        where: { relatedUserId: absentee.id, status: { notIn: ['closed'] }, trigger: 'absent_3_weeks' },
      });

      if (!existing) {
        const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
        followUps.push(
          prisma.followUp.create({
            data: {
              title: `${absentee.firstName} ${absentee.lastName} absent 3+ weeks`,
              trigger: 'absent_3_weeks',
              assignedTo: admin?.id || 1,
              createdBy: admin?.id || 1,
              relatedUserId: absentee.id,
            },
          })
        );
      }
    }

    return prisma.$transaction(followUps);
  }
}

export const followUpService = new FollowUpService();
