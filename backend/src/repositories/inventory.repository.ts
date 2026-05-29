import { executeQuery } from '../config/database';
import { InventoryItem, InventoryItemResponse } from '../models';

export class InventoryRepository {
  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string
  ): Promise<{ data: InventoryItemResponse[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['ii.is_active = TRUE'];
    const params: any[] = [];

    if (search) {
      conditions.push('MATCH(ii.search_normalized) AGAINST (? IN BOOLEAN MODE)');
      params.push(search);
    }
    if (category) {
      conditions.push('ii.category = ?');
      params.push(category);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM inventory_items ii ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const data = await executeQuery<InventoryItemResponse[]>(
      `SELECT ii.id, ii.name, ii.description, ii.total_quantity,
              COALESCE(ii.total_quantity - reserved.reserved_qty, ii.total_quantity) as available_quantity,
              ii.is_active, ii.created_at, ii.updated_at
       FROM inventory_items ii
       LEFT JOIN (
         SELECT ri.item_id, SUM(ri.quantity) as reserved_qty
         FROM reservation_items ri
         JOIN reservations r ON ri.reservation_id = r.id
         WHERE r.status IN ('pending', 'approved', 'active')
         AND r.is_active = TRUE
         GROUP BY ri.item_id
       ) reserved ON ii.id = reserved.item_id
       ${whereClause}
       ORDER BY ii.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data, total };
  }

  async findById(id: number): Promise<InventoryItem | null> {
    const items = await executeQuery<InventoryItem[]>(
      'SELECT * FROM inventory_items WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return items.length > 0 ? items[0] : null;
  }

  async create(data: {
    name: string;
    search_normalized: string;
    description?: string | null;
    total_quantity: number;
  }): Promise<InventoryItem> {
    const result = await executeQuery<any>(
      `INSERT INTO inventory_items (name, search_normalized, description, total_quantity)
       VALUES (?, ?, ?, ?)`,
      [data.name, data.search_normalized, data.description || null, data.total_quantity]
    );
    return this.findById(result.insertId) as Promise<InventoryItem>;
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      search_normalized: string;
      description: string;
      total_quantity: number;
      is_active: boolean;
    }>
  ): Promise<InventoryItem | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.search_normalized !== undefined) {
      fields.push('search_normalized = ?');
      params.push(data.search_normalized);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }
    if (data.total_quantity !== undefined) {
      fields.push('total_quantity = ?');
      params.push(data.total_quantity);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active);
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await executeQuery(
      `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return this.findById(id);
  }

  async softDelete(id: number): Promise<void> {
    await executeQuery(
      'UPDATE inventory_items SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }

  async getReservedQuantity(itemId: number): Promise<number> {
    const result = await executeQuery<any[]>(
      `SELECT COALESCE(SUM(ri.quantity), 0) as reserved_qty
       FROM reservation_items ri
       JOIN reservations r ON ri.reservation_id = r.id
       WHERE ri.item_id = ? AND r.status IN ('pending', 'approved', 'active')
       AND r.is_active = TRUE`,
      [itemId]
    );
    return result[0].reserved_qty;
  }
}
