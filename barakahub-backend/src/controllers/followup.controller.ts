import { Response } from 'express';
import { followUpService } from '../services/followup.service';
import { AuthRequest } from '../middleware/auth';

export class FollowUpController {
  async create(req: AuthRequest, res: Response) {
    try {
      const followUp = await followUpService.create({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.status(201).json(followUp);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: AuthRequest, res: Response) {
    try {
      const { status, assignedTo, trigger, page, limit } = req.query as Record<string, string>;
      const result = await followUpService.findAll({
        status,
        assignedTo: assignedTo ? parseInt(assignedTo) : undefined,
        trigger,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { status, notes } = req.body;
      const result = await followUpService.updateStatus(id, status, notes);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getStats(req: AuthRequest, res: Response) {
    try {
      const stats = await followUpService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const followUpController = new FollowUpController();
