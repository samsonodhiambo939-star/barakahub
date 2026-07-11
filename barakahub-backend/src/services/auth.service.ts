import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { generateMemberNo, sanitizePhone } from '../utils/helpers';

export class AuthService {
  async register(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    idNumber?: string;
    gender: string;
    password: string;
  }) {
    const phone = sanitizePhone(data.phone);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone }] },
    });

    if (existing) {
      throw new Error('Phone number already registered');
    }

    const lastUser = await prisma.user.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const memberNo = generateMemberNo(lastUser?.id ?? 0);
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        memberNo,
        firstName: data.firstName,
        lastName: data.lastName,
        phone,
        email: data.email,
        idNumber: data.idNumber,
        gender: data.gender as any,
        passwordHash,
      },
    });

    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        memberNo: user.memberNo,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(phone: string, password: string) {
    const sanitizedPhone = sanitizePhone(phone);

    const user = await prisma.user.findUnique({
      where: { phone: sanitizedPhone },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive || user.status === 'deceased') {
      throw new Error('Account is inactive. Contact admin.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(user.id);

    return {
      token,
      requiresTwoFactor: user.twoFactorEnabled,
      user: {
        id: user.id,
        memberNo: user.memberNo,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  generateToken(userId: number): string {
    return jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}

export const authService = new AuthService();
