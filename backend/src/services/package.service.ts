import { PackageRepository } from '../repositories/package.repository';
import { ReservationRepository } from '../repositories/reservation.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { AppError } from '../middlewares/error-handler';
import { normalizeArabic } from '../utils/arabic-normalizer';
import { PackageResponse } from '../models';

const packageRepo = new PackageRepository();
const reservationRepo = new ReservationRepository();
const auditRepo = new AuditRepository();

export class PackageService {
  async findAll(
    page: number,
    limit: number,
    search?: string
  ): Promise<{
    data: PackageResponse[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { data, total } = await packageRepo.findAll(page, limit, search);
    return { data, meta: { total, page, limit } };
  }

  async findById(id: number): Promise<PackageResponse | null> {
    return packageRepo.findById(id);
  }

  async create(
    data: {
      name: string;
      description?: string;
      items: { inventory_id: number; quantity: number }[];
    },
    actorId?: number
  ): Promise<PackageResponse> {
    const search_normalized = normalizeArabic(data.name);
    const pkg = await packageRepo.create({
      ...data,
      search_normalized,
    });

    await auditRepo.create({
      user_id: actorId || null,
      action: 'CREATE',
      entity_type: 'package',
      entity_id: pkg.id,
      new_values: { name: pkg.name },
    });

    return pkg;
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      items: { inventory_id: number; quantity: number }[];
    }>,
    actorId?: number
  ): Promise<PackageResponse | null> {
    const pkg = await packageRepo.findById(id);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', 'Package not found');
    }

    const oldValues = { name: pkg.name };

    const updateData: any = { ...data };
    if (data.name) {
      updateData.search_normalized = normalizeArabic(data.name);
    }

    const updated = await packageRepo.update(id, updateData);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'UPDATE',
      entity_type: 'package',
      entity_id: id,
      old_values: oldValues,
      new_values: updateData,
    });

    return updated;
  }

  async delete(id: number, actorId?: number): Promise<void> {
    const pkg = await packageRepo.findById(id);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', 'Package not found');
    }

    await reservationRepo.cancelByPackage(id);
    await packageRepo.softDelete(id);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'DELETE',
      entity_type: 'package',
      entity_id: id,
      old_values: { name: pkg.name },
    });
  }
}
