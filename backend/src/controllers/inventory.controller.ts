import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryService } from '../services/inventory.service';

const inventoryService = new InventoryService();

const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  total_quantity: z.number().int().min(0, 'Quantity must be non-negative'),
});

const updateItemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  total_quantity: z.number().int().min(0).optional(),
});

export class InventoryController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const result = await inventoryService.findAll(page, limit, search, category);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const item = await inventoryService.findById(id);
      if (!item) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Item not found', details: [] });
        return;
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createItemSchema.parse(req.body);
      const item = await inventoryService.create(data, req.user?.userId);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data = updateItemSchema.parse(req.body);
      const item = await inventoryService.update(id, data, req.user?.userId);
      if (!item) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Item not found', details: [] });
        return;
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await inventoryService.delete(id, req.user?.userId);
      res.json({ message: 'Item deleted and cleaned up successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
