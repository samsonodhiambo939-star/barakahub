import { Response } from 'express';
import { groupService } from '../services/group.service';
import { AuthRequest } from '../middleware/auth';

export class GroupController {
  async create(req: AuthRequest, res: Response) {
    try {
      const group = await groupService.create(req.body);
      res.status(201).json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAll(req: AuthRequest, res: Response) {
    try {
      const { page, limit, type, estate, status, search } = req.query as Record<string, string>;
      const result = await groupService.findAll({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        type,
        estate,
        status,
        search,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const group = await groupService.findById(id);
      res.json(group);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const group = await groupService.update(id, req.body);
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async addMember(req: AuthRequest, res: Response) {
    try {
      const groupId = parseInt(req.params.id as string);
      const { userId } = req.body;
      const member = await groupService.addMember(groupId, userId);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async addMembers(req: AuthRequest, res: Response) {
    try {
      const groupId = parseInt(req.params.id as string);
      const { memberIds } = req.body;
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: 'memberIds array is required' });
      }
      const result = await groupService.addMembers(groupId, memberIds);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeMember(req: AuthRequest, res: Response) {
    try {
      const groupId = parseInt(req.params.id as string);
      const userId = parseInt(req.params.userId as string);
      await groupService.removeMember(groupId, userId);
      res.json({ message: 'Member removed from group' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateMemberRole(req: AuthRequest, res: Response) {
    try {
      const groupId = parseInt(req.params.id as string);
      const userId = parseInt(req.params.userId as string);
      const { role } = req.body;
      if (!role) return res.status(400).json({ error: 'role is required' });
      const member = await groupService.updateMemberRole(groupId, userId, role);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getStats(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const stats = await groupService.getStats(id);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getSuggestedMembers(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const group = await groupService.findById(id);
      if (!group.estate) return res.json([]);
      const members = await groupService.getSuggestedMembers(group.estate, id);
      res.json(members);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async myGroups(req: AuthRequest, res: Response) {
    try {
      const groups = await groupService.getLeaderGroups(req.user!.id);
      res.json(groups);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const groupController = new GroupController();
