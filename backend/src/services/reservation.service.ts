import { executeQuery } from '../config/database';
import { ReservationRepository } from '../repositories/reservation.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { AppError } from '../middlewares/error-handler';
import { Reservation, CreateReservationPayload } from '../models';

const reservationRepo = new ReservationRepository();
const inventoryRepo = new InventoryRepository();
const auditRepo = new AuditRepository();

export class ReservationService {
  async findAll(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      borrower_entity_id?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<{
    data: Reservation[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { data, total } = await reservationRepo.findAll(params);
    return {
      data,
      meta: {
        total,
        page: params.page || 1,
        limit: params.limit || 20,
      },
    };
  }

  async findById(id: number): Promise<any | null> {
    const reservation = await reservationRepo.findById(id);
    if (!reservation) return null;

    const items = await reservationRepo.getReservationItems(id);
    return { ...reservation, items };
  }

  async create(
    payload: CreateReservationPayload,
    userId: number
  ): Promise<Reservation> {
    for (const item of payload.items) {
      const inventory = await inventoryRepo.findById(item.inventory_id);
      if (!inventory) {
        throw new AppError(404, 'ITEM_NOT_FOUND', `Item ${item.inventory_id} not found`);
      }

      const reservedQty = await reservationRepo.checkAvailability({
        item_id: item.inventory_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        pickup_time: payload.pickup_time,
        return_time: payload.return_time,
      });

      if (reservedQty + item.quantity > inventory.total_quantity) {
        throw new AppError(
          409,
          'INSUFFICIENT_INVENTORY',
          `Insufficient quantity for item ${inventory.name}. Available: ${inventory.total_quantity - reservedQty}`
        );
      }
    }

    for (const pkg of payload.packages) {
      const pkgItems = await this.getPackageItemIds(pkg.package_id);
      for (const itemId of pkgItems) {
        const inventory = await inventoryRepo.findById(itemId);
        if (!inventory) continue;

        const reservedQty = await reservationRepo.checkAvailability({
          item_id: itemId,
          start_date: payload.start_date,
          end_date: payload.end_date,
          pickup_time: payload.pickup_time,
          return_time: payload.return_time,
        });

        const pkgItemQty = await this.getPackageItemQuantity(
          pkg.package_id,
          itemId
        );

        if (reservedQty + pkgItemQty * pkg.quantity > inventory.total_quantity) {
          throw new AppError(
            409,
            'INSUFFICIENT_INVENTORY',
            `Insufficient quantity for item ${inventory.name} (part of package)`
          );
        }
      }
    }

    const reservation = await reservationRepo.create({
      user_id: userId,
      entity_id: payload.borrower_entity_id,
      status: 'pending',
      start_date: payload.start_date,
      end_date: payload.end_date,
      pickup_time: payload.pickup_time,
      return_time: payload.return_time,
      notes: payload.notes,
    });

    for (const item of payload.items) {
      await reservationRepo.addReservationItem({
        reservation_id: reservation.id,
        item_id: item.inventory_id,
        quantity: item.quantity,
      });
    }

    for (const pkg of payload.packages) {
      await reservationRepo.addReservationItem({
        reservation_id: reservation.id,
        package_id: pkg.package_id,
        quantity: pkg.quantity,
      });
    }

    await auditRepo.create({
      user_id: userId,
      action: 'CREATE',
      entity_type: 'reservation',
      entity_id: reservation.id,
      new_values: {
        entity_id: payload.borrower_entity_id,
        status: 'pending',
      },
    });

    return reservation;
  }

  async updateStatus(
    id: number,
    status: string
  ): Promise<Reservation | null> {
    const reservation = await reservationRepo.findById(id);
    if (!reservation) {
      throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    }

    await reservationRepo.updateStatus(id, status);
    return reservationRepo.findById(id);
  }

  async delete(id: number, userId?: number): Promise<void> {
    const reservation = await reservationRepo.findById(id);
    if (!reservation) {
      throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    }

    await reservationRepo.softDelete(id);

    await auditRepo.create({
      user_id: userId || null,
      action: 'DELETE',
      entity_type: 'reservation',
      entity_id: id,
      old_values: { status: reservation.status },
    });
  }

  async markReturned(id: number, notes?: string): Promise<Reservation | null> {
    const reservation = await reservationRepo.findById(id);
    if (!reservation) {
      throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    }

    if (reservation.status !== 'approved' && reservation.status !== 'active') {
      throw new AppError(
        400,
        'INVALID_STATUS',
        'Only approved/active reservations can be marked as returned'
      );
    }

    await reservationRepo.updateStatus(id, 'returned');
    return reservationRepo.findById(id);
  }

  async update(
    id: number,
    payload: Partial<CreateReservationPayload>,
    userId?: number
  ): Promise<Reservation | null> {
    const reservation = await reservationRepo.findById(id);
    if (!reservation) {
      throw new AppError(404, 'NOT_FOUND', 'Reservation not found');
    }

    const updateData: any = {};
    if (payload.borrower_entity_id) updateData.entity_id = payload.borrower_entity_id;
    if (payload.start_date) updateData.start_date = payload.start_date;
    if (payload.end_date) updateData.end_date = payload.end_date;
    if (payload.pickup_time) updateData.pickup_time = payload.pickup_time;
    if (payload.return_time) updateData.return_time = payload.return_time;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    if (Object.keys(updateData).length > 0) {
      const fields = Object.keys(updateData)
        .map((k) => `${k} = ?`)
        .join(', ');
      const params = Object.values(updateData);
      params.push(id);

      const { executeQuery } = require('../config/database');
      await executeQuery(
        `UPDATE reservations SET ${fields} WHERE id = ?`,
        params
      );

      await auditRepo.create({
        user_id: userId || null,
        action: 'UPDATE',
        entity_type: 'reservation',
        entity_id: id,
        old_values: { status: reservation.status },
        new_values: updateData,
      });
    }

    return reservationRepo.findById(id);
  }

  private async getPackageItemIds(packageId: number): Promise<number[]> {
    const rows = await executeQuery<any[]>(
      'SELECT item_id FROM package_items WHERE package_id = ?',
      [packageId]
    );
    return rows.map((r: any) => r.item_id);
  }

  private async getPackageItemQuantity(
    packageId: number,
    itemId: number
  ): Promise<number> {
    const rows = await executeQuery<any[]>(
      'SELECT quantity FROM package_items WHERE package_id = ? AND item_id = ?',
      [packageId, itemId]
    );
    return rows.length > 0 ? rows[0].quantity : 1;
  }
}
