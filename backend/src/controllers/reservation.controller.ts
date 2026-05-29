import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReservationService } from '../services/reservation.service';

const reservationService = new ReservationService();

const reservationItemSchema = z.object({
  inventory_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const reservationPackageSchema = z.object({
  package_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

const createReservationSchema = z.object({
  borrower_entity_id: z.number().int().positive(),
  pickup_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)'),
  return_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().optional(),
  items: z.array(reservationItemSchema).optional().default([]),
  packages: z.array(reservationPackageSchema).optional().default([]),
}).refine(
  (data) => data.items.length > 0 || data.packages.length > 0,
  { message: 'At least one item or package is required' }
);

const updateReservationSchema = z.object({
  borrower_entity_id: z.number().int().positive().optional(),
  pickup_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  return_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  items: z.array(reservationItemSchema).optional(),
  packages: z.array(reservationPackageSchema).optional(),
});

export class ReservationController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const borrower_entity_id = req.query.borrower_entity_id
        ? parseInt(req.query.borrower_entity_id as string)
        : undefined;
      const start_date = req.query.start_date as string | undefined;
      const end_date = req.query.end_date as string | undefined;

      const result = await reservationService.findAll({
        page,
        limit,
        status,
        borrower_entity_id,
        start_date,
        end_date,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const reservation = await reservationService.findById(id);
      if (!reservation) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Reservation not found', details: [] });
        return;
      }
      res.json(reservation);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createReservationSchema.parse(req.body);
      const reservation = await reservationService.create(
        {
          borrower_entity_id: data.borrower_entity_id,
          pickup_time: data.pickup_time,
          return_time: data.return_time,
          start_date: data.start_date,
          end_date: data.end_date,
          notes: data.notes,
          items: data.items,
          packages: data.packages,
        },
        req.user!.userId
      );
      res.status(201).json(reservation);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const data = updateReservationSchema.parse(req.body);
      const reservation = await reservationService.update(id, data, req.user?.userId);
      if (!reservation) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Reservation not found', details: [] });
        return;
      }
      res.json(reservation);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await reservationService.delete(id, req.user?.userId);
      res.json({ message: 'Reservation cancelled' });
    } catch (error) {
      next(error);
    }
  }

  async markReturned(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const notes = req.body.notes as string | undefined;
      const reservation = await reservationService.markReturned(id, notes);
      res.json({
        message: 'Reservation successfully returned',
        status: 'completed',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reservationController = new ReservationController();
