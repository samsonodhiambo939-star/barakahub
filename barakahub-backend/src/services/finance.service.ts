import { prisma } from '../utils/prisma';

export class FinanceService {
  async createTransaction(data: {
    userId?: number;
    amount: number;
    categoryId: number;
    paymentMethod: string;
    transactionDate?: string;
    referenceNote?: string;
    serviceId?: number;
    mpesaReceipt?: string;
    recordedByUserId: number;
  }) {
    if (data.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (data.mpesaReceipt) {
      const existing = await prisma.transaction.findUnique({
        where: { mpesaReceipt: data.mpesaReceipt },
      });
      if (existing) {
        throw new Error('Duplicate M-Pesa receipt number');
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: data.userId || null,
        amount: data.amount,
        categoryId: data.categoryId,
        paymentMethod: data.paymentMethod as any,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        referenceNote: data.referenceNote,
        serviceId: data.serviceId || null,
        mpesaReceipt: data.mpesaReceipt || null,
        recordedByUserId: data.recordedByUserId,
        status: 'completed',
      },
      include: {
        user: {
          select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true },
        },
        category: { select: { id: true, name: true } },
      },
    });

    return transaction;
  }

  async reverseTransaction(transactionId: number, reason: string, recordedByUserId: number) {
    const original = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!original) throw new Error('Transaction not found');
    if (original.reversalId) throw new Error('Transaction already reversed');

    const reversal = await prisma.transaction.create({
      data: {
        userId: original.userId,
        amount: original.amount,
        categoryId: original.categoryId,
        paymentMethod: original.paymentMethod,
        referenceNote: `REVERSAL: ${reason}. Original ref: ${original.mpesaReceipt || original.id}`,
        recordedByUserId,
        status: 'completed',
        reversalId: original.id,
      },
    });

    return reversal;
  }

  async findAllTransactions(params: {
    userId?: number;
    categoryId?: number;
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { reversalId: null };

    if (params.userId) where.userId = params.userId;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.status) where.status = params.status;
    if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
    if (params.startDate || params.endDate) {
      where.transactionDate = {};
      if (params.startDate) where.transactionDate.gte = new Date(params.startDate);
      if (params.endDate) where.transactionDate.lte = new Date(params.endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: { select: { id: true, memberNo: true, firstName: true, lastName: true, phone: true } },
          category: { select: { id: true, name: true } },
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getGivingSummary(userId: number, startDate?: string, endDate?: string) {
    const where: any = { userId, reversalId: null, status: 'completed' };
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { transactionDate: 'desc' },
    });

    const total = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const byCategory = transactions.reduce((acc: Record<string, number>, t: any) => {
      const cat = t.category.name;
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});

    return { total, byCategory, transactions, count: transactions.length };
  }

  async createPledge(data: {
    userId: number;
    categoryId: number;
    amount: number;
    targetDate?: string;
    notes?: string;
  }) {
    return prisma.pledge.create({
      data: {
        userId: data.userId,
        categoryId: data.categoryId,
        amount: data.amount,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        notes: data.notes,
      },
      include: {
        user: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true } },
      },
    });
  }

  async getCategories() {
    return prisma.givingCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getMonthlyReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: { gte: startDate, lte: endDate },
        status: 'completed',
        reversalId: null,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    const total = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const byCategory = transactions.reduce((acc: Record<string, number>, t: any) => {
      const cat = t.category.name;
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});

    const byMethod = transactions.reduce((acc: Record<string, number>, t: any) => {
      const method = t.paymentMethod;
      acc[method] = (acc[method] || 0) + t.amount;
      return acc;
    }, {});

    return {
      period: { year, month },
      total,
      byCategory,
      byMethod,
      count: transactions.length,
    };
  }
}

export const financeService = new FinanceService();
