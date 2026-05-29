import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service';

const configService = new ConfigService();

export class ConfigController {
  async getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await configService.getConfig();
      res.json(config);
    } catch (error) {
      next(error);
    }
  }

  async updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await configService.updateConfig(req.body, req.user?.userId);
      res.json(config);
    } catch (error) {
      next(error);
    }
  }
}

export const configController = new ConfigController();
