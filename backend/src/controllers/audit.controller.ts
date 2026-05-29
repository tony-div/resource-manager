import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';

const auditService = new AuditService();

export class AuditController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const user_id = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;
      const action = req.query.action as string | undefined;
      const entity_type = req.query.entity_type as string | undefined;

      const result = await auditService.findAll({ page, limit, user_id, action, entity_type });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
