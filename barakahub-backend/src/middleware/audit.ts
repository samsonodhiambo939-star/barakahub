import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../utils/prisma';

export function auditLog(action: string, table: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode < 400 && req.user) {
        prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action,
            table,
            recordId: body?.id || body?.data?.id,
            oldValues: (req as any).oldValues ? JSON.stringify((req as any).oldValues) : null,
            newValues: JSON.stringify(body),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        }).catch((err: any) => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };

    next();
  };
}
