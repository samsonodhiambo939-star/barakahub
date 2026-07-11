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
        relatedUser: { select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true, photoUrl: true } },
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
    const limit = params.limit || 50;
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
          relatedUser: { select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true, photoUrl: true } },
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
    if (status === 'closed' || status === 'done') {
      data.closedAt = new Date();
      data.status = 'closed';
    }
    if (notes) data.notes = notes;

    return prisma.followUp.update({
      where: { id },
      data,
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        relatedUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  async completeTask(id: number, outcome: string, notes?: string, nextActionDate?: string) {
    const data: any = {
      status: 'closed',
      closedAt: new Date(),
      outcome,
    };
    if (notes) data.notes = notes;
    if (nextActionDate) data.dueDate = new Date(nextActionDate);

    return prisma.followUp.update({
      where: { id },
      data,
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        relatedUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  async getStats() {
    const [open, inProgress, closed, overdue, totalTasks] = await Promise.all([
      prisma.followUp.count({ where: { status: 'open' } }),
      prisma.followUp.count({ where: { status: 'in_progress' } }),
      prisma.followUp.count({
        where: { status: 'closed', closedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
      prisma.followUp.count({
        where: { status: 'open', dueDate: { lt: new Date() } },
      }),
      prisma.followUp.count(),
    ]);

    return { pending: open, inProgress, completedThisWeek: closed, overdue, total: totalTasks };
  }

  // ─── Smart List: Absent 3+ Weeks ────────────────────
  async getAbsentMembers() {
    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

    const activeMembers = await prisma.user.findMany({
      where: { isActive: true, status: 'active', deletedAt: null },
      select: { id: true },
    });
    const activeIds = activeMembers.map((u) => u.id);

    const attendeeIds = (
      await prisma.attendance.findMany({
        where: { checkInTime: { gte: twentyOneDaysAgo }, userId: { in: activeIds } },
        select: { userId: true },
        distinct: ['userId'],
      })
    ).map((a) => a.userId);

    const absentIds = activeIds.filter((id) => !attendeeIds.includes(id));

    if (absentIds.length === 0) return [];

    const [users, lastAttendances, groups, existingTasks] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: absentIds } },
        select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true, photoUrl: true, joinDate: true },
      }),
      prisma.attendance.groupBy({
        by: ['userId'],
        where: { userId: { in: absentIds } },
        _max: { checkInTime: true },
      }),
      prisma.groupMember.findMany({
        where: { userId: { in: absentIds } },
        include: { group: { select: { id: true, name: true } } },
      }),
      prisma.followUp.findMany({
        where: { relatedUserId: { in: absentIds }, trigger: 'absent_3_weeks', status: { notIn: ['closed'] } },
        select: { id: true, relatedUserId: true, assignedTo: true, status: true, assignedUser: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    const lastSeenMap = new Map(lastAttendances.map((a) => [a.userId, a._max.checkInTime]));
    const groupMap = new Map<string, { id: number; name: string }[]>();
    groups.forEach((gm) => {
      const arr = groupMap.get(String(gm.userId)) || [];
      arr.push(gm.group);
      groupMap.set(String(gm.userId), arr);
    });
    const taskMap = new Map(existingTasks.map((t) => [t.relatedUserId, t]));

    return users.map((u) => ({
      ...u,
      lastSeen: lastSeenMap.get(u.id) || null,
      groups: groupMap.get(String(u.id)) || [],
      assignedTask: taskMap.get(u.id) || null,
    }));
  }

  // ─── Smart List: First-Time Visitors ────────────────
  async getFirstTimeVisitors() {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const records = await prisma.attendance.findMany({
      where: { isFirstTime: true, checkInTime: { gte: fourteenDaysAgo } },
      include: {
        user: { select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true, photoUrl: true, joinDate: true, status: true } },
        service: { select: { id: true, date: true, name: true } },
        checkedInByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { checkInTime: 'desc' },
    });

    const visitorIds = [...new Set(records.map((r) => r.userId))];
    const existingTasks = await prisma.followUp.findMany({
      where: { relatedUserId: { in: visitorIds }, trigger: 'new_visitor', status: { notIn: ['closed'] } },
      select: { id: true, relatedUserId: true, assignedTo: true, status: true, assignedUser: { select: { id: true, firstName: true, lastName: true } } },
    });
    const taskMap = new Map(existingTasks.map((t) => [t.relatedUserId, t]));

    return records.map((r) => ({
      id: r.user.id,
      attendanceId: r.id,
      memberNo: r.user.memberNo,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      phone: r.user.phone,
      estate: r.user.estate,
      photoUrl: r.user.photoUrl,
      visitDate: r.checkInTime,
      serviceName: r.service?.name,
      invitedBy: r.checkedInByUser ? `${r.checkedInByUser.firstName} ${r.checkedInByUser.lastName}` : null,
      status: r.user.status,
      assignedTask: taskMap.get(r.user.id) || null,
    }));
  }

  // ─── Assign Task ─────────────────────────────────────
  async assignTask(data: {
    relatedUserId: number;
    trigger: string;
    title: string;
    description?: string;
    assignedTo: number;
    createdBy: number;
    dueDate?: string;
  }) {
    return prisma.followUp.create({
      data: {
        title: data.title,
        description: data.description,
        trigger: data.trigger as any,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        relatedUserId: data.relatedUserId,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 3 * 86400000),
        status: 'open',
      },
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        relatedUser: { select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true, photoUrl: true } },
      },
    });
  }

  // ─── Get leaders for assignment ──────────────────────
  async getLeaders() {
    const leaders = await prisma.user.findMany({
      where: { role: { in: ['leader', 'pastor', 'admin'] }, isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true, role: true },
      orderBy: { firstName: 'asc' },
    });
    return leaders;
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
