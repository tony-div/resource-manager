import { AuditRepository } from '../repositories/audit.repository';
import { AuditLog } from '../models';

const auditRepo = new AuditRepository();

export class AuditService {
  async findAll(params: {
    page?: number;
    limit?: number;
    user_id?: number;
    action?: string;
    entity_type?: string;
  }): Promise<{
    data: AuditLog[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { data, total } = await auditRepo.findAll(params);
    return {
      data,
      meta: {
        total,
        page: params.page || 1,
        limit: params.limit || 50,
      },
    };
  }
}
