import { Response } from 'express';
import { financeService } from '../services/finance.service';
import { AuthRequest } from '../middleware/auth';

export class FinanceController {
  async createTransaction(req: AuthRequest, res: Response) {
    try {
      const transaction = await financeService.createTransaction({
        ...req.body,
        recordedByUserId: req.user!.id,
      });
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async reverseTransaction(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const { reason } = req.body;
      if (!reason || reason.trim().length < 3) {
        return res.status(400).json({ error: 'Void reason is required (min 3 characters)' });
      }
      const reversal = await financeService.reverseTransaction(
        id, reason, req.user!.id
      );
      res.json(reversal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getNextReceiptNo(_req: AuthRequest, res: Response) {
    try {
      const receiptNo = await financeService.generateReceiptNo();
      res.json({ receiptNo });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async findAllTransactions(req: AuthRequest, res: Response) {
    try {
      const { userId, categoryId, status, paymentMethod, search, startDate, endDate, page, limit } = req.query as Record<string, string>;
      const result = await financeService.findAllTransactions({
        userId: userId ? parseInt(userId as string) : undefined,
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        status: status as string,
        paymentMethod: paymentMethod as string,
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMyGiving(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const summary = await financeService.getGivingSummary(
        req.user!.id,
        startDate as string,
        endDate as string
      );
      res.json(summary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMemberGiving(req: AuthRequest, res: Response) {
    try {
      const userId = parseInt(req.params.userId as string);
      const { startDate, endDate } = req.query;
      const summary = await financeService.getGivingSummary(
        userId,
        startDate as string,
        endDate as string
      );
      res.json(summary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async createPledge(req: AuthRequest, res: Response) {
    try {
      const pledge = await financeService.createPledge(req.body);
      res.status(201).json(pledge);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getCategories(req: AuthRequest, res: Response) {
    try {
      const categories = await financeService.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMonthlyReport(req: AuthRequest, res: Response) {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      const report = await financeService.getMonthlyReport(year, month);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const financeController = new FinanceController();
