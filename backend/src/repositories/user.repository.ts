import { executeQuery } from '../config/database';
import { User, UserResponse } from '../models';

export class UserRepository {
  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ data: UserResponse[]; total: number }> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE u.is_active = TRUE';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND u.username LIKE ?';
      params.push(`%${search}%`);
    }

    const countResult = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const data = await executeQuery<UserResponse[]>(
      `SELECT id, username, role, full_name, is_active, created_at, updated_at
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data, total };
  }

  async findById(id: number): Promise<User | null> {
    const users = await executeQuery<User[]>(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return users.length > 0 ? users[0] : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const users = await executeQuery<User[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return users.length > 0 ? users[0] : null;
  }

  async create(data: {
    username: string;
    password_hash: string;
    role: string;
    full_name: string;
  }): Promise<User> {
    const result = await executeQuery<any>(
      `INSERT INTO users (username, password_hash, role, full_name)
       VALUES (?, ?, ?, ?)`,
      [data.username, data.password_hash, data.role, data.full_name]
    );
    return this.findById(result.insertId) as Promise<User>;
  }

  async update(
    id: number,
    data: Partial<{
      username: string;
      role: string;
      is_active: boolean;
      full_name: string;
    }>
  ): Promise<User | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.username !== undefined) {
      fields.push('username = ?');
      params.push(data.username);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      params.push(data.role);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active);
    }
    if (data.full_name !== undefined) {
      fields.push('full_name = ?');
      params.push(data.full_name);
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await executeQuery(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return this.findById(id);
  }

  async softDelete(id: number): Promise<void> {
    await executeQuery('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
  }

  async getUserEntities(userId: number): Promise<number[]> {
    const rows = await executeQuery<any[]>(
      'SELECT entity_id FROM user_borrower_entity WHERE user_id = ?',
      [userId]
    );
    return rows.map((r: any) => r.entity_id);
  }
}
