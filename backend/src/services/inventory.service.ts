import { InventoryRepository } from '../repositories/inventory.repository';
import { ReservationRepository } from '../repositories/reservation.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { AppError } from '../middlewares/error-handler';
import { normalizeArabic } from '../utils/arabic-normalizer';
import { InventoryItem, InventoryItemResponse } from '../models';

const inventoryRepo = new InventoryRepository();
const reservationRepo = new ReservationRepository();
const auditRepo = new AuditRepository();

export class InventoryService {
  async findAll(
    page: number,
    limit: number,
    search?: string,
    category?: string
  ): Promise<{
    data: InventoryItemResponse[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { data, total } = await inventoryRepo.findAll(page, limit, search, category);
    return { data, meta: { total, page, limit } };
  }

  async findById(id: number): Promise<InventoryItem | null> {
    return inventoryRepo.findById(id);
  }

  async create(
    data: {
      name: string;
      description?: string;
      total_quantity: number;
    },
    actorId?: number
  ): Promise<InventoryItem> {
    const search_normalized = normalizeArabic(data.name);
    const item = await inventoryRepo.create({
      ...data,
      search_normalized,
    });

    await auditRepo.create({
      user_id: actorId || null,
      action: 'CREATE',
      entity_type: 'inventory',
      entity_id: item.id,
      new_values: { name: item.name, total_quantity: item.total_quantity },
    });

    return item;
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      total_quantity: number;
    }>,
    actorId?: number
  ): Promise<InventoryItem | null> {
    const item = await inventoryRepo.findById(id);
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Inventory item not found');
    }

    const oldValues = {
      name: item.name,
      total_quantity: item.total_quantity,
    };

    const updateData: any = { ...data };

    if (data.name) {
      updateData.search_normalized = normalizeArabic(data.name);
    }

    if (
      data.total_quantity !== undefined &&
      data.total_quantity < item.total_quantity
    ) {
      const reservedQty = await inventoryRepo.getReservedQuantity(id);
      if (data.total_quantity < reservedQty) {
        let overflow = reservedQty - data.total_quantity;
        const reservations = await reservationRepo.getOverlappingReservations({
          start_date: '1970-01-01',
          end_date: '2099-12-31',
          pickup_time: '00:00:00',
          return_time: '23:59:59',
        });
        for (const res of reservations) {
          if (overflow <= 0) break;
          const resItems = await reservationRepo.getReservationItems(res.id);
          for (const resItem of resItems) {
            if (resItem.item_id === id) {
              const toCancel = Math.min(overflow, resItem.quantity);
              overflow -= toCancel;
              await reservationRepo.updateStatus(res.id, 'cancelled');
              break;
            }
          }
        }
      }
    }

    const updated = await inventoryRepo.update(id, updateData);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'UPDATE',
      entity_type: 'inventory',
      entity_id: id,
      old_values: oldValues,
      new_values: updateData,
    });

    return updated;
  }

  async delete(id: number, actorId?: number): Promise<void> {
    const item = await inventoryRepo.findById(id);
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Inventory item not found');
    }

    await reservationRepo.cancelByItem(id);
    await inventoryRepo.softDelete(id);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'DELETE',
      entity_type: 'inventory',
      entity_id: id,
      old_values: { name: item.name },
    });
  }
}
