import { executeQuery } from '../config/database';
import { BorrowerEntity } from '../models';

export class EntityRepository {
  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ data: BorrowerEntity[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE be.is_active = TRUE';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND be.name LIKE ?';
      params.push(`%${search}%`);
    }

    const countResult = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM borrower_entities be ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const data = await executeQuery<BorrowerEntity[]>(
      `SELECT * FROM borrower_entities be ${whereClause}
       ORDER BY be.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data, total };
  }

  async findById(id: number): Promise<BorrowerEntity | null> {
    const entities = await executeQuery<BorrowerEntity[]>(
      'SELECT * FROM borrower_entities WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return entities.length > 0 ? entities[0] : null;
  }

  async create(data: {
    name: string;
    description?: string | null;
  }): Promise<BorrowerEntity> {
    const result = await executeQuery<any>(
      'INSERT INTO borrower_entities (name, description) VALUES (?, ?)',
      [data.name, data.description || null]
    );
    return this.findById(result.insertId) as Promise<BorrowerEntity>;
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      is_active: boolean;
    }>
  ): Promise<BorrowerEntity | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active);
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await executeQuery(
      `UPDATE borrower_entities SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return this.findById(id);
  }

  async softDelete(id: number): Promise<void> {
    await executeQuery(
      'UPDATE borrower_entities SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }
}
