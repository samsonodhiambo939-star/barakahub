import { prisma } from '../utils/prisma';

export class GroupService {
  async create(data: { name: string; description?: string; leaderId?: number; estate?: string }) {
    return prisma.churchGroup.create({
      data,
      include: {
        leader: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(params: { page?: number; limit?: number; estate?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null, isActive: true };
    if (params.estate) where.estate = params.estate;

    const [groups, total] = await Promise.all([
      prisma.churchGroup.findMany({
        where,
        include: {
          leader: { select: { id: true, firstName: true, lastName: true, phone: true } },
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
        leader: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        members: {
          include: {
            user: {
              select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true, estate: true },
            },
          },
        },
      },
    });

    if (!group || group.deletedAt) throw new Error('Group not found');
    return group;
  }

  async addMember(groupId: number, userId: number) {
    return prisma.groupMember.create({
      data: { groupId, userId },
      include: {
        user: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeMember(groupId: number, userId: number) {
    return prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  async getLeaderGroups(leaderId: number) {
    return prisma.churchGroup.findMany({
      where: { leaderId, deletedAt: null },
      include: { _count: { select: { members: true } } },
    });
  }
}

export const groupService = new GroupService();
