import { executeQuery } from '../config/database';
import { AppConfig } from '../models';

export class ConfigRepository {
  async findAll(): Promise<AppConfig[]> {
    return executeQuery<AppConfig[]>('SELECT * FROM app_config');
  }

  async findByKey(key: string): Promise<AppConfig | null> {
    const configs = await executeQuery<AppConfig[]>(
      'SELECT * FROM app_config WHERE `key` = ?',
      [key]
    );
    return configs.length > 0 ? configs[0] : null;
  }

  async upsert(key: string, value: Record<string, unknown>): Promise<void> {
    await executeQuery(
      'INSERT INTO app_config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, JSON.stringify(value), JSON.stringify(value)]
    );
  }

  async delete(key: string): Promise<void> {
    await executeQuery('DELETE FROM app_config WHERE `key` = ?', [key]);
  }
}
