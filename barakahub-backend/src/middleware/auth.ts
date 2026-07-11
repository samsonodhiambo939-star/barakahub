import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uuid: string;
    memberNo: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    twoFactorEnabled: boolean;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        uuid: true,
        memberNo: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        twoFactorEnabled: true,
        isActive: true,
        status: true,
      },
    });

    if (!user || !user.isActive || user.status === 'deceased') {
      return res.status(401).json({ error: 'Account is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
