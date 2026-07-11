import { Response } from 'express';
import { attendanceService } from '../services/attendance.service';
import { AuthRequest } from '../middleware/auth';

export class AttendanceController {
  async createService(req: AuthRequest, res: Response) {
    try {
      const service = await attendanceService.createService({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.status(201).json(service);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getServices(req: AuthRequest, res: Response) {
    try {
      const { page, limit, upcoming, status, startDate, endDate } = req.query as Record<string, string>;
      const result = await attendanceService.getServices({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        upcoming: upcoming === 'true',
        status,
        startDate,
        endDate,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async closeService(req: AuthRequest, res: Response) {
    try {
      const serviceId = parseInt(req.params.id as string);
      const service = await attendanceService.closeService(serviceId, req.user!.id);
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async reopenService(req: AuthRequest, res: Response) {
    try {
      const serviceId = parseInt(req.params.id as string);
      const service = await attendanceService.reopenService(serviceId);
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async checkIn(req: AuthRequest, res: Response) {
    try {
      const attendance = await attendanceService.checkIn({
        ...req.body,
        checkedInBy: req.user!.id,
      });
      res.status(201).json(attendance);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async undoCheckIn(req: AuthRequest, res: Response) {
    try {
      const serviceId = parseInt(req.params.serviceId as string);
      const userId = parseInt(req.params.userId as string);
      const result = await attendanceService.undoCheckIn(serviceId, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getServiceAttendance(req: AuthRequest, res: Response) {
    try {
      const serviceId = parseInt(req.params.serviceId as string);
      const records = await attendanceService.getServiceAttendance(serviceId);
      res.json(records);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAbsentees(req: AuthRequest, res: Response) {
    try {
      const serviceId = parseInt(req.params.serviceId as string);
      const absentees = await attendanceService.getAbsentees(serviceId);
      res.json(absentees);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async syncOffline(req: AuthRequest, res: Response) {
    try {
      const results = await attendanceService.syncOffline(req.body);
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAttendanceReport(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const report = await attendanceService.getAttendanceReport({ startDate, endDate });
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const attendanceController = new AttendanceController();
