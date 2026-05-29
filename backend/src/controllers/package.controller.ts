import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PackageService } from '../services/package.service';

const packageService = new PackageService();

const packageItemSchema = z.object({
  inventory_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createPackageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  items: z.array(packageItemSchema).min(1, 'At least one item is required'),
});

const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  items: z.array(packageItemSchema).min(1).optional(),
});

export class PackageController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const result = await packageService.findAll(page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const pkg = await packageService.findById(id);
      if (!pkg) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Package not found', details: [] });
        return;
      }
      res.json(pkg);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createPackageSchema.parse(req.body);
      const pkg = await packageService.create(data, req.user?.userId);
      res.status(201).json(pkg);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data = updatePackageSchema.parse(req.body);
      const pkg = await packageService.update(id, data, req.user?.userId);
      if (!pkg) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Package not found', details: [] });
        return;
      }
      res.json(pkg);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await packageService.delete(id, req.user?.userId);
      res.json({ message: 'Package deleted and reservations cancelled' });
    } catch (error) {
      next(error);
    }
  }
}

export const packageController = new PackageController();
