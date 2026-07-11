import { z } from 'zod';

export const createTransactionSchema = z.object({
  body: z.object({
    userId: z.number().int().optional(),
    amount: z.number().positive('Amount must be positive'),
    categoryId: z.number().int(),
    paymentMethod: z.enum(['mpesa_stk', 'mpesa_c2b', 'cash', 'bank']),
    transactionDate: z.string().optional(),
    referenceNote: z.string().optional(),
    serviceId: z.number().int().optional(),
    mpesaReceipt: z.string().optional(),
  }),
});

export const stkPushSchema = z.object({
  body: z.object({
    phone: z.string().min(10).max(15),
    amount: z.number().positive().max(150000, 'Maximum STK amount is KSh 150,000'),
    categoryId: z.number().int(),
    accountRef: z.string().optional(),
    transactionDesc: z.string().optional(),
  }),
});

export const pledgeSchema = z.object({
  body: z.object({
    userId: z.number().int(),
    categoryId: z.number().int(),
    amount: z.number().positive(),
    targetDate: z.string().optional(),
    notes: z.string().optional(),
  }),
});
