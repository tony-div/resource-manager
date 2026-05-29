import { executeQuery } from '../config/database';
import { AuditLog } from '../models';

export class AuditRepository {
  async findAll(params: {
    page?: number;
    limit?: number;
    user_id?: number;
    action?: string;
    entity_type?: string;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (params.user_id) {
      conditions.push('al.user_id = ?');
      queryParams.push(params.user_id);
    }
    if (params.action) {
      conditions.push('al.action = ?');
      queryParams.push(params.action);
    }
    if (params.entity_type) {
      conditions.push('al.entity_type = ?');
      queryParams.push(params.entity_type);
    }

    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await executeQuery<any[]>(
      `SELECT COUNT(*) as total FROM audit_log al ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    const data = await executeQuery<AuditLog[]>(
      `SELECT * FROM audit_log al ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return { data, total };
  }

  async create(data: {
    user_id: number | null;
    action: string;
    entity_type: string;
    entity_id: number;
    old_values?: Record<string, unknown> | null;
    new_values?: Record<string, unknown> | null;
  }): Promise<void> {
    await executeQuery(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.action,
        data.entity_type,
        data.entity_id,
        data.old_values ? JSON.stringify(data.old_values) : null,
        data.new_values ? JSON.stringify(data.new_values) : null,
      ]
    );
  }
}
