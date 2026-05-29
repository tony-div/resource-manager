import { UserRepository } from '../repositories/user.repository';
import { AuditRepository } from '../repositories/audit.repository';
import { hashPassword } from '../utils/password';
import { AppError } from '../middlewares/error-handler';
import { UserResponse } from '../models';

const userRepo = new UserRepository();
const auditRepo = new AuditRepository();

export class UserService {
  async findAll(
    page: number,
    limit: number,
    search?: string
  ): Promise<{ data: UserResponse[]; meta: { total: number; page: number; limit: number } }> {
    const { data, total } = await userRepo.findAll(page, limit, search);
    return { data, meta: { total, page, limit } };
  }

  async findById(id: number): Promise<UserResponse | null> {
    const user = await userRepo.findById(id);
    if (!user) return null;
    const { password_hash, ...response } = user;
    return response;
  }

  async create(data: {
    username: string;
    password: string;
    role: string;
    full_name: string;
  }): Promise<UserResponse> {
    const existing = await userRepo.findByUsername(data.username);
    if (existing) {
      throw new AppError(409, 'DUPLICATE_USERNAME', 'Username already exists');
    }

    const password_hash = await hashPassword(data.password);
    const user = await userRepo.create({
      username: data.username,
      password_hash,
      role: data.role,
      full_name: data.full_name,
    });

    await auditRepo.create({
      user_id: user.id,
      action: 'CREATE',
      entity_type: 'user',
      entity_id: user.id,
      new_values: { username: user.username, role: user.role },
    });

    const { password_hash: _, ...response } = user;
    return response;
  }

  async update(
    id: number,
    data: Partial<{
      username: string;
      role: string;
      is_active: boolean;
      full_name: string;
    }>,
    actorId?: number
  ): Promise<UserResponse | null> {
    const user = await userRepo.findById(id);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const oldValues = {
      username: user.username,
      role: user.role,
      is_active: user.is_active,
    };

    const updated = await userRepo.update(id, data);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'UPDATE',
      entity_type: 'user',
      entity_id: id,
      old_values: oldValues,
      new_values: data as Record<string, unknown>,
    });

    if (!updated) return null;
    const { password_hash, ...response } = updated;
    return response;
  }

  async delete(id: number, actorId?: number): Promise<void> {
    const user = await userRepo.findById(id);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    await userRepo.softDelete(id);

    await auditRepo.create({
      user_id: actorId || null,
      action: 'DELETE',
      entity_type: 'user',
      entity_id: id,
      old_values: { username: user.username },
    });
  }
}
