import { ReservationRepository } from '../repositories/reservation.repository';
import { InventoryRepository } from '../repositories/inventory.repository';
import { EntityRepository } from '../repositories/entity.repository';
import { DashboardStats } from '../models';

const reservationRepo = new ReservationRepository();
const inventoryRepo = new InventoryRepository();
const entityRepo = new EntityRepository();

export class DashboardService {
  async getStats(): Promise<DashboardStats> {
    const [activeReservations, pendingReturns, inventoryResult, entityResult] =
      await Promise.all([
        reservationRepo.getActiveReservationsCount(),
        reservationRepo.getPendingReturnsCount(),
        inventoryRepo.findAll(1, 1),
        entityRepo.findAll(1, 1),
      ]);

    return {
      active_reservations_count: activeReservations,
      pending_returns_count: pendingReturns,
      total_inventory_items: inventoryResult.total,
      total_borrower_entities: entityResult.total,
    };
  }
}
