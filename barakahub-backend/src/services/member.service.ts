import { prisma } from '../utils/prisma';
import { sanitizePhone, generateMemberNo } from '../utils/helpers';
import bcrypt from 'bcryptjs';

export class MemberService {
  async create(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    idNumber?: string;
    gender: string;
    dob?: string;
    maritalStatus?: string;
    physicalAddress?: string;
    estate?: string;
  }) {
    const phone = sanitizePhone(data.phone);

    const lastUser = await prisma.user.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const memberNo = generateMemberNo(lastUser?.id ?? 0);
    const defaultPassword = await bcrypt.hash('Welcome@123', 12);

    const user = await prisma.user.create({
      data: {
        memberNo,
        firstName: data.firstName,
        lastName: data.lastName,
        phone,
        email: data.email,
        idNumber: data.idNumber,
        gender: data.gender as any,
        dob: data.dob ? new Date(data.dob) : undefined,
        maritalStatus: (data.maritalStatus as any) || 'single',
        physicalAddress: data.physicalAddress,
        estate: data.estate,
        passwordHash: defaultPassword,
      },
      select: {
        id: true,
        memberNo: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        gender: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAll(params: {
    search?: string;
    estate?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (params.search) {
      const search = params.search;
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { memberNo: { contains: search } },
        { estate: { contains: search } },
      ];
    }

    if (params.estate) where.estate = params.estate;
    if (params.status) where.status = params.status;
    if (params.role) where.role = params.role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
          select: {
            id: true,
            memberNo: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            gender: true,
            maritalStatus: true,
            estate: true,
            role: true,
            status: true,
            isActive: true,
            photoUrl: true,
            joinDate: true,
            lastLoginAt: true,
            createdAt: true,
          },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        uuid: true,
        memberNo: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        idNumber: true,
        gender: true,
        dob: true,
        maritalStatus: true,
        physicalAddress: true,
        estate: true,
        photoUrl: true,
        joinDate: true,
        baptismDate: true,
        isActive: true,
        status: true,
        role: true,
        lastLoginAt: true,
        deletedAt: true,
        createdAt: true,
        familiesHeaded: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    memberNo: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        familyMembers: {
          include: {
            family: {
              select: {
                id: true,
                familyName: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new Error('Member not found');
    }

    return user;
  }

  async update(id: number, data: any) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new Error('Member not found');

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        dob: data.dob ? new Date(data.dob) : undefined,
      },
      select: {
        id: true,
        memberNo: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        gender: true,
        role: true,
        isActive: true,
      },
    });

    return updated;
  }

  async deactivate(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Member not found');

    return prisma.user.update({
      where: { id },
      data: { isActive: false, status: 'inactive' as any },
    });
  }
}

export const memberService = new MemberService();
