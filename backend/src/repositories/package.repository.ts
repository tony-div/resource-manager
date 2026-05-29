import { executeQuery } from '../config/database';
import { Package, PackageItem, PackageResponse, PackageItemDetail } from '../models';

export class PackageRepository {
  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ data: PackageResponse[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE p.is_active = TRUE';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND MATCH(p.search_normalized) AGAINST (? IN BOOLEAN MODE)';
      params.push(search);
    }

    const countResult = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM packages p ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const packages = await executeQuery<Package[]>(
      `SELECT * FROM packages p ${whereClause}
       ORDER BY p.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const data: PackageResponse[] = await Promise.all(
      packages.map((pkg) => this.enrichPackage(pkg))
    );

    return { data, total };
  }

  async findById(id: number): Promise<PackageResponse | null> {
    const packages = await executeQuery<Package[]>(
      'SELECT * FROM packages WHERE id = ? AND is_active = TRUE',
      [id]
    );
    if (packages.length === 0) return null;
    return this.enrichPackage(packages[0]);
  }

  private async enrichPackage(pkg: Package): Promise<PackageResponse> {
    const items = await executeQuery<PackageItemDetail[]>(
      `SELECT pi.item_id as inventory_id, ii.name, pi.quantity
       FROM package_items pi
       JOIN inventory_items ii ON pi.item_id = ii.id
       WHERE pi.package_id = ? AND ii.is_active = TRUE`,
      [pkg.id]
    );

    return { ...pkg, items };
  }

  async create(data: {
    name: string;
    search_normalized: string;
    description?: string | null;
    items: { inventory_id: number; quantity: number }[];
  }): Promise<PackageResponse> {
    const result = await executeQuery<any>(
      'INSERT INTO packages (name, search_normalized, description) VALUES (?, ?, ?)',
      [data.name, data.search_normalized, data.description || null]
    );
    const packageId = result.insertId;

    for (const item of data.items) {
      await executeQuery(
        'INSERT INTO package_items (package_id, item_id, quantity) VALUES (?, ?, ?)',
        [packageId, item.inventory_id, item.quantity]
      );
    }

    return this.findById(packageId) as Promise<PackageResponse>;
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      search_normalized: string;
      description: string;
      is_active: boolean;
      items: { inventory_id: number; quantity: number }[];
    }>
  ): Promise<PackageResponse | null> {
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
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active);
    }

    if (fields.length > 0) {
      params.push(id);
      await executeQuery(
        `UPDATE packages SET ${fields.join(', ')} WHERE id = ?`,
        params
      );
    }

    if (data.items !== undefined) {
      await executeQuery('DELETE FROM package_items WHERE package_id = ?', [id]);
      for (const item of data.items) {
        await executeQuery(
          'INSERT INTO package_items (package_id, item_id, quantity) VALUES (?, ?, ?)',
          [id, item.inventory_id, item.quantity]
        );
      }
    }

    return this.findById(id);
  }

  async softDelete(id: number): Promise<void> {
    await executeQuery('UPDATE packages SET is_active = FALSE WHERE id = ?', [id]);
  }

  async getPackageItemIds(packageId: number): Promise<number[]> {
    const rows = await executeQuery<any[]>(
      'SELECT item_id FROM package_items WHERE package_id = ?',
      [packageId]
    );
    return rows.map((r: any) => r.item_id);
  }
}
