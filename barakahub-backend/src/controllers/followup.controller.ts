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

  async getAbsentMembers(req: AuthRequest, res: Response) {
    try {
      const members = await followUpService.getAbsentMembers();
      res.json(members);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getFirstTimeVisitors(req: AuthRequest, res: Response) {
    try {
      const visitors = await followUpService.getFirstTimeVisitors();
      res.json(visitors);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async assignTask(req: AuthRequest, res: Response) {
    try {
      const task = await followUpService.assignTask({
        ...req.body,
        createdBy: req.user!.id,
      });
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async completeTask(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { outcome, notes, nextActionDate } = req.body;
      if (!outcome) return res.status(400).json({ error: 'Outcome is required' });
      const result = await followUpService.completeTask(id, outcome, notes, nextActionDate);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getLeaders(req: AuthRequest, res: Response) {
    try {
      const leaders = await followUpService.getLeaders();
      res.json(leaders);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const followUpController = new FollowUpController();
