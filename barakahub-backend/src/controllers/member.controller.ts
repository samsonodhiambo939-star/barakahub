import { Request, Response, NextFunction } from 'express';
import { memberService } from '../services/member.service';
import { AuthRequest } from '../middleware/auth';

export class MemberController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const member = await memberService.create(req.body);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, estate, status, role, page, limit } = req.query as Record<string, string>;
      const result = await memberService.findAll({
        search,
        estate,
        status,
        role,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      const member = await memberService.findById(id);
      res.json(member);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      const member = await memberService.update(id, req.body);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string);
      await memberService.deactivate(id);
      res.json({ message: 'Member deactivated' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const memberController = new MemberController();
