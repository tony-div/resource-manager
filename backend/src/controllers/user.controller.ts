import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service';

const userService = new UserService();

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'manager', 'borrower']),
  full_name: z.string().min(1, 'Full name is required'),
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  role: z.enum(['admin', 'manager', 'borrower']).optional(),
  is_active: z.boolean().optional(),
  full_name: z.string().min(1).optional(),
});

export class UserController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const result = await userService.findAll(page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const user = await userService.findById(id);
      if (!user) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'User not found', details: [] });
        return;
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await userService.create(data);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data = updateUserSchema.parse(req.body);
      const user = await userService.update(id, data, req.user?.userId);
      if (!user) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'User not found', details: [] });
        return;
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await userService.delete(id, req.user?.userId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
