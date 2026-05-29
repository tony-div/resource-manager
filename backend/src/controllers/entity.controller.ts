import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EntityService } from '../services/entity.service';

const entityService = new EntityService();

const createEntitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const updateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export class EntityController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const result = await entityService.findAll(page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const entity = await entityService.findById(id);
      if (!entity) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Entity not found', details: [] });
        return;
      }
      res.json(entity);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createEntitySchema.parse(req.body);
      const entity = await entityService.create(data, req.user?.userId);
      res.status(201).json(entity);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data = updateEntitySchema.parse(req.body);
      const entity = await entityService.update(id, data, req.user?.userId);
      if (!entity) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Entity not found', details: [] });
        return;
      }
      res.json(entity);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await entityService.delete(id, req.user?.userId);
      res.json({ message: 'Entity deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const entityController = new EntityController();
