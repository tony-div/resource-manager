import { EntityRepository } from '../repositories/entity.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { AppError } from '../middlewares/error-handler';
import { BorrowerEntity } from '../models';

const entityRepo = new EntityRepository();
const auditRepo = new AuditRepository();

export class EntityService {
  async findAll(
    page: number,
    limit: number,
    search?: string
  ): Promise<{ data: BorrowerEntity[]; meta: { total: number; page: number; limit: number } }> {
    const { data, total } = await entityRepo.findAll(page, limit, search);
    return { data, meta: { total, page, limit } };
  }

  async findById(id: number): Promise<BorrowerEntity | null> {
    return entityRepo.findById(id);
  }

  async create(
    data: { name: string; description?: string },
    actorId?: number
  ): Promise<BorrowerEntity> {
    const entity = await entityRepo.create(data);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'CREATE',
      entity_type: 'borrower_entity',
      entity_id: entity.id,
      new_values: { name: entity.name },
    });

    return entity;
  }

  async update(
    id: number,
    data: Partial<{ name: string; description: string; is_active: boolean }>,
    actorId?: number
  ): Promise<BorrowerEntity | null> {
    const entity = await entityRepo.findById(id);
    if (!entity) {
      throw new AppError(404, 'NOT_FOUND', 'Entity not found');
    }

    const oldValues = { name: entity.name };

    const updated = await entityRepo.update(id, data);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'UPDATE',
      entity_type: 'borrower_entity',
      entity_id: id,
      old_values: oldValues,
      new_values: data as Record<string, unknown>,
    });

    return updated;
  }

  async delete(id: number, actorId?: number): Promise<void> {
    const entity = await entityRepo.findById(id);
    if (!entity) {
      throw new AppError(404, 'NOT_FOUND', 'Entity not found');
    }

    await entityRepo.softDelete(id);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'DELETE',
      entity_type: 'borrower_entity',
      entity_id: id,
      old_values: { name: entity.name },
    });
  }
}
