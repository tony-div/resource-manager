import api from './api';
import { AppConfig } from '../types';

export const configService = {
  async getConfig(): Promise<AppConfig> {
    const response = await api.get<AppConfig>('/config');
    return response.data;
  },

  async updateConfig(data: Partial<AppConfig>): Promise<AppConfig> {
    const response = await api.put<AppConfig>('/config', data);
    return response.data;
  },
};
