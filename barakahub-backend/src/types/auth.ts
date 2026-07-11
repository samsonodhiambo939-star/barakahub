import { z } from 'zod';

const phoneRegex = /^(?:254|\+254|0)?[17]\d{8}$/;

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: z.string().regex(phoneRegex, 'Phone must be a valid Kenyan number (e.g. 2547XXXXXXXX or 07XXXXXXXX)'),
    email: z.string().email().optional(),
    idNumber: z.string().min(1).max(20).optional(),
    gender: z.enum(['male', 'female']),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Phone is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(1),
    otp: z.string().length(6),
  }),
});

export const twoFactorSchema = z.object({
  body: z.object({
    token: z.string().length(6),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
