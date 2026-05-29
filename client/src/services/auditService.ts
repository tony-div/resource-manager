import api from './api';
import { AuditLog, PaginatedResponse } from '../types';

export const auditService = {
  async findAll(params?: {
    page?: number;
    limit?: number;
    user_id?: number;
    action?: string;
    entity_type?: string;
  }): Promise<PaginatedResponse<AuditLog>> {
    const response = await api.get<PaginatedResponse<AuditLog>>('/audit-logs', {
      params,
    });
    return response.data;
  },
};
