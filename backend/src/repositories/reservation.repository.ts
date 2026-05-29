import { executeQuery } from '../config/database';
import { Reservation, ReservationItem } from '../models';

export class ReservationRepository {
  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    borrower_entity_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{ data: Reservation[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const conditions: string[] = ['r.is_active = TRUE'];
    const queryParams: any[] = [];

    if (params.status) {
      conditions.push('r.status = ?');
      queryParams.push(params.status);
    }
    if (params.borrower_entity_id) {
      conditions.push('r.entity_id = ?');
      queryParams.push(params.borrower_entity_id);
    }
    if (params.start_date) {
      conditions.push('r.start_date >= ?');
      queryParams.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push('r.end_date <= ?');
      queryParams.push(params.end_date);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM reservations r ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    const data = await executeQuery<Reservation[]>(
      `SELECT * FROM reservations r ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return { data, total };
  }

  async findById(id: number): Promise<Reservation | null> {
    const reservations = await executeQuery<Reservation[]>(
      'SELECT * FROM reservations WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return reservations.length > 0 ? reservations[0] : null;
  }

  async create(data: {
    user_id: number;
    entity_id: number;
    status: string;
    start_date: string;
    end_date: string;
    pickup_time: string;
    return_time: string;
    notes?: string | null;
  }): Promise<Reservation> {
    const result = await executeQuery<any>(
      `INSERT INTO reservations (user_id, entity_id, status, start_date, end_date, pickup_time, return_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.entity_id,
        data.status,
        data.start_date,
        data.end_date,
        data.pickup_time,
        data.return_time,
        data.notes || null,
      ]
    );
    return this.findById(result.insertId) as Promise<Reservation>;
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await executeQuery('UPDATE reservations SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
  }

  async getReservationItems(reservationId: number): Promise<ReservationItem[]> {
    return executeQuery<ReservationItem[]>(
      'SELECT * FROM reservation_items WHERE reservation_id = ?',
      [reservationId]
    );
  }

  async addReservationItem(data: {
    reservation_id: number;
    item_id?: number | null;
    package_id?: number | null;
    quantity: number;
  }): Promise<void> {
    await executeQuery(
      `INSERT INTO reservation_items (reservation_id, item_id, package_id, quantity)
       VALUES (?, ?, ?, ?)`,
      [data.reservation_id, data.item_id || null, data.package_id || null, data.quantity]
    );
  }

  async checkAvailability(params: {
    item_id: number;
    start_date: string;
    end_date: string;
    pickup_time: string;
    return_time: string;
    exclude_reservation_id?: number;
  }): Promise<number> {
    let excludeClause = '';
    const queryParams: any[] = [params.item_id, params.start_date, params.end_date];

    if (params.exclude_reservation_id) {
      excludeClause = 'AND r.id != ?';
      queryParams.push(params.exclude_reservation_id);
    }

    const result = await executeQuery<any[]>(
      `SELECT COALESCE(SUM(ri.quantity), 0) as reserved_qty
       FROM reservation_items ri
       JOIN reservations r ON ri.reservation_id = r.id
       WHERE ri.item_id = ?
       AND r.is_active = TRUE
       AND r.status IN ('pending', 'approved', 'active')
       AND r.start_date <= ? AND r.end_date >= ?
       ${excludeClause}`,
      queryParams
    );
    return result[0].reserved_qty;
  }

  async softDelete(id: number): Promise<void> {
    await executeQuery(
      'UPDATE reservations SET is_active = FALSE, status = ? WHERE id = ?',
      ['cancelled', id]
    );
  }

  async cancelByItem(itemId: number): Promise<void> {
    await executeQuery(
      `UPDATE reservations r
       JOIN reservation_items ri ON r.id = ri.reservation_id
       SET r.status = 'cancelled', r.is_active = FALSE
       WHERE ri.item_id = ? AND r.status IN ('pending', 'approved')`,
      [itemId]
    );
  }

  async cancelByPackage(packageId: number): Promise<void> {
    await executeQuery(
      `UPDATE reservations r
       JOIN reservation_items ri ON r.id = ri.reservation_id
       SET r.status = 'cancelled', r.is_active = FALSE
       WHERE ri.package_id = ? AND r.status IN ('pending', 'approved')`,
      [packageId]
    );
  }

  async getOverlappingReservations(params: {
    start_date: string;
    end_date: string;
    pickup_time: string;
    return_time: string;
  }): Promise<Reservation[]> {
    return executeQuery<Reservation[]>(
      `SELECT * FROM reservations
       WHERE is_active = TRUE
       AND status IN ('pending', 'approved', 'active')
       AND start_date <= ? AND end_date >= ?
       AND pickup_time < ? AND return_time > ?`,
      [params.end_date, params.start_date, params.return_time, params.pickup_time]
    );
  }

  async getActiveReservationsCount(): Promise<number> {
    const result = await executeQuery<any[]>(
      "SELECT COUNT(*) as count FROM reservations WHERE status IN ('approved', 'active') AND is_active = TRUE"
    );
    return result[0].count;
  }

  async getPendingReturnsCount(): Promise<number> {
    const result = await executeQuery<any[]>(
      "SELECT COUNT(*) as count FROM reservations WHERE status = 'approved' AND is_active = TRUE AND end_date < CURDATE()"
    );
    return result[0].count;
  }
}
