import { prisma } from '../utils/prisma';

export class AttendanceService {
  async createService(data: {
    name: string;
    serviceType: string;
    date: string;
    location?: string;
    notes?: string;
    createdBy: number;
  }) {
    return prisma.service.create({
      data: {
        name: data.name,
        serviceType: data.serviceType as any,
        date: new Date(data.date),
        location: data.location,
        notes: data.notes,
        createdBy: data.createdBy,
      },
    });
  }

  async getServices(params: { page?: number; limit?: number; upcoming?: boolean }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (params.upcoming) {
      where.date = { gte: new Date() };
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { attendances: true } },
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.service.count({ where }),
    ]);

    return {
      data: services,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async checkIn(data: {
    userId: number;
    serviceId: number;
    checkInMethod: string;
    isOfflineSync?: boolean;
  }) {
    const existing = await prisma.attendance.findUnique({
      where: { userId_serviceId: { userId: data.userId, serviceId: data.serviceId } },
    });

    if (existing) {
      throw new Error('Already checked in for this service');
    }

    return prisma.attendance.create({
      data: {
        userId: data.userId,
        serviceId: data.serviceId,
        checkInMethod: data.checkInMethod as any,
        isOfflineSync: data.isOfflineSync || false,
        syncedAt: data.isOfflineSync ? new Date() : null,
      },
      include: {
        user: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
        service: { select: { id: true, name: true, serviceType: true } },
      },
    });
  }

  async getServiceAttendance(serviceId: number) {
    return prisma.attendance.findMany({
      where: { serviceId },
      include: {
        user: {
          select: {
            id: true, memberNo: true, firstName: true, lastName: true,
            phone: true, estate: true, photoUrl: true,
          },
        },
      },
      orderBy: { checkInTime: 'desc' },
    });
  }

  async getAbsentees(serviceId: number) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new Error('Service not found');

    const presentUserIds = (
      await prisma.attendance.findMany({
        where: { serviceId },
        select: { userId: true },
      })
    ).map((a: any) => a.userId);

    const absentees = await prisma.user.findMany({
      where: {
        id: { notIn: presentUserIds },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true, memberNo: true, firstName: true, lastName: true,
        phone: true, estate: true,
      },
    });

    return absentees;
  }

  async syncOffline(data: Array<{ userId: number; serviceId: number; checkInTime: string; checkInMethod: string }>) {
    const results = [];
    for (const record of data) {
      try {
        const result = await this.checkIn({
          userId: record.userId,
          serviceId: record.serviceId,
          checkInMethod: record.checkInMethod,
          isOfflineSync: true,
        });
        results.push(result);
      } catch (err: any) {
        results.push({ error: err.message, record });
      }
    }
    return results;
  }

  async getAttendanceReport(params: { startDate: string; endDate: string }) {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);

    const attendances = await prisma.attendance.findMany({
      where: {
        checkInTime: { gte: start, lte: end },
      },
      include: {
        service: { select: { id: true, name: true, serviceType: true, date: true } },
        user: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
      },
      orderBy: { checkInTime: 'desc' },
    });

    const byService = attendances.reduce((acc: Record<string, number>, a: any) => {
      const key = a.service?.name || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      total: attendances.length,
      byService,
      records: attendances,
    };
  }
}

export const attendanceService = new AttendanceService();
