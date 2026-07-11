import { prisma } from '../utils/prisma';

export class CommunicationService {
  async createPrayerRequest(data: {
    userId?: number;
    name?: string;
    phone?: string;
    request: string;
    isAnonymous?: boolean;
  }) {
    return prisma.prayerRequest.create({
      data: {
        userId: data.userId,
        name: data.isAnonymous ? undefined : data.name,
        phone: data.phone,
        request: data.request,
        isAnonymous: data.isAnonymous || false,
      },
    });
  }

  async getPrayerRequests(params: { status?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;

    const [requests, total] = await Promise.all([
      prisma.prayerRequest.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prayerRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updatePrayerStatus(id: number, status: string, response?: string, assignedTo?: number) {
    return prisma.prayerRequest.update({
      where: { id },
      data: { status: status as any, response, assignedTo },
    });
  }

  async sendSms(recipientId: number, body: string, sentById: number) {
    return prisma.message.create({
      data: {
        recipientId,
        body,
        type: 'sms',
        sentById,
        status: 'pending',
      },
    });
  }

  async sendBulkSms(data: {
    recipientIds: number[];
    body: string;
    sentById: number;
  }) {
    const messages = data.recipientIds.map((recipientId) => ({
      recipientId,
      body: data.body,
      type: 'sms',
      sentById: data.sentById,
      status: 'pending' as const,
    }));

    return prisma.message.createMany({ data: messages });
  }

  async getMessages(params: { sentById?: number; recipientId?: number; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.sentById) where.sentById = params.sentById;
    if (params.recipientId) where.recipientId = params.recipientId;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          recipient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          sentBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
      prisma.message.count({ where }),
    ]);

    return {
      data: messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createAnnouncement(data: {
    title: string;
    body: string;
    sendSms?: boolean;
    sendEmail?: boolean;
    createdBy: number;
  }) {
    return prisma.announcement.create({
      data: {
        ...data,
        publishedAt: new Date(),
      },
    });
  }

  async getAnnouncements(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        include: {
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.announcement.count(),
    ]);

    return {
      data: announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const communicationService = new CommunicationService();
