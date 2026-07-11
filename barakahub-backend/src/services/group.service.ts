import { prisma } from '../utils/prisma';

interface CreateGroupData {
  name: string;
  type?: string;
  description?: string;
  leaderId?: number;
  assistantLeaderId?: number;
  estate?: string;
  meetingDay?: string;
  meetingTime?: string;
  location?: string;
  status?: string;
}

interface FindAllParams {
  page?: number;
  limit?: number;
  type?: string;
  estate?: string;
  status?: string;
  search?: string;
}

export class GroupService {
  async create(data: CreateGroupData) {
    const group = await prisma.churchGroup.create({
      data: {
        name: data.name,
        type: (data.type as any) || 'cell',
        description: data.description,
        leaderId: data.leaderId,
        assistantLeaderId: data.assistantLeaderId,
        estate: data.estate,
        meetingDay: data.meetingDay,
        meetingTime: data.meetingTime,
        location: data.location,
        status: (data.status as any) || 'active',
      },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
        assistantLeader: { select: { id: true, firstName: true, lastName: true, phone: true } },
        _count: { select: { members: true } },
      },
    });

    if (data.leaderId) {
      await prisma.user.update({
        where: { id: data.leaderId },
        data: { role: 'leader' },
      });
    }

    return group;
  }

  async findAll(params: FindAllParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (params.type) where.type = params.type;
    if (params.estate) where.estate = params.estate;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { leader: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { leader: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [groups, total] = await Promise.all([
      prisma.churchGroup.findMany({
        where,
        include: {
          leader: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
          assistantLeader: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { members: true } },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.churchGroup.count({ where }),
    ]);

    return {
      data: groups,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number) {
    const group = await prisma.churchGroup.findUnique({
      where: { id },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, photoUrl: true } },
        assistantLeader: { select: { id: true, firstName: true, lastName: true, phone: true } },
        members: {
          include: {
            user: {
              select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true, photoUrl: true, role: true, status: true, joinDate: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true, followUps: true } },
      },
    });

    if (!group || group.deletedAt) throw new Error('Group not found');
    return group;
  }

  async update(id: number, data: Partial<CreateGroupData>) {
    const group = await prisma.churchGroup.findUnique({ where: { id } });
    if (!group || group.deletedAt) throw new Error('Group not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.leaderId !== undefined) updateData.leaderId = data.leaderId;
    if (data.assistantLeaderId !== undefined) updateData.assistantLeaderId = data.assistantLeaderId;
    if (data.estate !== undefined) updateData.estate = data.estate;
    if (data.meetingDay !== undefined) updateData.meetingDay = data.meetingDay;
    if (data.meetingTime !== undefined) updateData.meetingTime = data.meetingTime;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.churchGroup.update({
      where: { id },
      data: updateData,
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
        assistantLeader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
    });

    if (data.leaderId) {
      await prisma.user.update({
        where: { id: data.leaderId },
        data: { role: 'leader' },
      });
    }

    return updated;
  }

  async addMember(groupId: number, userId: number) {
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing) throw new Error('Member already in group');

    return prisma.groupMember.create({
      data: { groupId, userId },
      include: {
        user: { select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, photoUrl: true } },
      },
    });
  }

  async addMembers(groupId: number, userIds: number[]) {
    const existing = await prisma.groupMember.findMany({
      where: { groupId, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const toAdd = userIds.filter((id) => !existingIds.has(id));

    if (toAdd.length === 0) return { added: 0, skipped: userIds.length };

    await prisma.groupMember.createMany({
      data: toAdd.map((userId) => ({ groupId, userId })),
      skipDuplicates: true,
    });

    return { added: toAdd.length, skipped: userIds.length - toAdd.length };
  }

  async removeMember(groupId: number, userId: number) {
    return prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  async updateMemberRole(groupId: number, userId: number, role: string) {
    return prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role: role as any },
    });
  }

  async getStats(id: number) {
    const group = await prisma.churchGroup.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
        members: { select: { userId: true } },
      },
    });
    if (!group) throw new Error('Group not found');

    const memberIds = group.members.map((m) => m.userId);

    const totalAttended = memberIds.length > 0 ? await prisma.attendance.groupBy({
      by: ['userId'],
      where: { userId: { in: memberIds } },
      _count: { userId: true },
    }) : [];

    const totalServices = await prisma.service.count({
      where: { status: 'closed', deletedAt: null },
    });

    const avgAttendance = totalServices > 0 && memberIds.length > 0
      ? Math.round((totalAttended.length / (memberIds.length * totalServices)) * 100)
      : 0;

    const totalGiving = memberIds.length > 0 ? await prisma.transaction.aggregate({
      where: { userId: { in: memberIds }, status: 'completed', reversalId: null },
      _sum: { amount: true },
    }) : { _sum: { amount: 0 } };

    const monthlyGiving = memberIds.length > 0 ? await prisma.transaction.aggregate({
      where: {
        userId: { in: memberIds },
        status: 'completed',
        reversalId: null,
        transactionDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }) : { _sum: { amount: 0 } };

    const followUpCount = await prisma.followUp.count({
      where: { groupId: id, status: { notIn: ['closed'] } },
    });

    return {
      totalMembers: memberIds.length,
      avgAttendance,
      totalServices,
      totalGiving: totalGiving._sum.amount || 0,
      monthlyGiving: monthlyGiving._sum.amount || 0,
      followUpCount,
    };
  }

  async getLeaderGroups(leaderId: number) {
    return prisma.churchGroup.findMany({
      where: {
        OR: [
          { leaderId, deletedAt: null },
          { assistantLeaderId: leaderId, deletedAt: null },
        ],
      },
      include: {
        _count: { select: { members: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getSuggestedMembers(estate: string, groupId: number) {
    const existingMemberIds = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const excludeIds = existingMemberIds.map((m) => m.userId);

    return prisma.user.findMany({
      where: {
        estate,
        isActive: true,
        deletedAt: null,
        id: { notIn: excludeIds },
      },
      select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true },
      take: 50,
    });
  }
}

export const groupService = new GroupService();
