import { ConfigRepository } from '../repositories/config.repository';
import { AuditRepository } from '../repositories/audit.repository';

const configRepo = new ConfigRepository();
const auditRepo = new AuditRepository();

export class ConfigService {
  async getConfig(): Promise<Record<string, unknown>> {
    const configs = await configRepo.findAll();
    const result: Record<string, unknown> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }
    return result;
  }

  async updateConfig(
    data: Record<string, unknown>,
    actorId?: number
  ): Promise<Record<string, unknown>> {
    for (const [key, value] of Object.entries(data)) {
      await configRepo.upsert(key, value as Record<string, unknown>);

      await auditRepo.create({
        user_id: actorId || null,
        action: 'UPDATE',
        entity_type: 'app_config',
        entity_id: 0,
        new_values: { [key]: value },
      });
    }
    return this.getConfig();
  }
}
