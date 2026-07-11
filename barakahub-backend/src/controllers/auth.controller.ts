import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      const result = await authService.login(phone, password);
      res.json(result);
    } catch (error: any) {
      const msg = error?.message || 'Login failed';
      res.status(401).json({ error: msg });
    }
  }

  async me(req: AuthRequest, res: Response) {
    res.json({ user: req.user });
  }

  async logout(req: AuthRequest, res: Response) {
    res.json({ message: 'Logged out successfully' });
  }
}

export const authController = new AuthController();
