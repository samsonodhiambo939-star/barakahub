import { Response } from 'express';
import { communicationService } from '../services/communication.service';
import { AuthRequest } from '../middleware/auth';

export class CommunicationController {
  async createPrayerRequest(req: AuthRequest, res: Response) {
    try {
      const request = await communicationService.createPrayerRequest({
        ...req.body,
        userId: req.user?.id,
      });
      res.status(201).json(request);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getPrayerRequests(req: AuthRequest, res: Response) {
    try {
      const { status, page, limit } = req.query as Record<string, string>;
      const result = await communicationService.getPrayerRequests({
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updatePrayerStatus(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { status, response } = req.body;
      const result = await communicationService.updatePrayerStatus(id, status, response, req.user?.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async sendSms(req: AuthRequest, res: Response) {
    try {
      const { recipientId, body } = req.body;
      const message = await communicationService.sendSms(recipientId, body, req.user!.id);
      res.status(201).json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async sendBulkSms(req: AuthRequest, res: Response) {
    try {
      const result = await communicationService.sendBulkSms({
        ...req.body,
        sentById: req.user!.id,
      });
      res.status(201).json({ count: result.count });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMessages(req: AuthRequest, res: Response) {
    try {
      const { sentById, recipientId, page, limit } = req.query as Record<string, string>;
      const result = await communicationService.getMessages({
        sentById: sentById ? parseInt(sentById) : undefined,
        recipientId: recipientId ? parseInt(recipientId) : undefined,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async createAnnouncement(req: AuthRequest, res: Response) {
    try {
      const announcement = await communicationService.createAnnouncement({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAnnouncements(req: AuthRequest, res: Response) {
    try {
      const { page, limit } = req.query as Record<string, string>;
      const result = await communicationService.getAnnouncements(
        page ? parseInt(page) : undefined,
        limit ? parseInt(limit) : undefined
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const communicationController = new CommunicationController();
