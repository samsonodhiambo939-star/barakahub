import { z } from 'zod';

export const createMemberSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: z.string().regex(/^(?:254|\+254|0)?[17]\d{8}$/, 'Valid Kenyan phone required (e.g. 2547XXXXXXXX or 07XXXXXXXX)'),
    email: z.string().email().optional(),
    idNumber: z.string().optional(),
    gender: z.enum(['male', 'female']),
    dob: z.string().optional(),
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
    physicalAddress: z.string().optional(),
    estate: z.string().optional(),
  }),
});

export const updateMemberSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email().optional(),
    idNumber: z.string().optional(),
    dob: z.string().optional(),
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
    physicalAddress: z.string().optional(),
    estate: z.string().optional(),
  }),
});
