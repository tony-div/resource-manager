import api from './api';
import { BorrowerEntity, PaginatedResponse } from '../types';

export const entityService = {
  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<BorrowerEntity>> {
    const response = await api.get<PaginatedResponse<BorrowerEntity>>(
      '/entities',
      { params }
    );
    return response.data;
  },

  async findById(id: number): Promise<BorrowerEntity> {
    const response = await api.get<BorrowerEntity>(`/entities/${id}`);
    return response.data;
  },

  async create(data: {
    name: string;
    description?: string;
  }): Promise<BorrowerEntity> {
    const response = await api.post<BorrowerEntity>('/entities', data);
    return response.data;
  },

  async update(
    id: number,
    data: Partial<{ name: string; description: string }>
  ): Promise<BorrowerEntity> {
    const response = await api.put<BorrowerEntity>(`/entities/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/entities/${id}`);
  },
};
