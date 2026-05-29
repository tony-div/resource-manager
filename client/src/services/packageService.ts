import api from './api';
import { Package, PaginatedResponse } from '../types';

export const packageService = {
  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Package>> {
    const response = await api.get<PaginatedResponse<Package>>('/packages', {
      params,
    });
    return response.data;
  },

  async findById(id: number): Promise<Package> {
    const response = await api.get<Package>(`/packages/${id}`);
    return response.data;
  },

  async create(data: {
    name: string;
    description?: string;
    items: { inventory_id: number; quantity: number }[];
  }): Promise<Package> {
    const response = await api.post<Package>('/packages', data);
    return response.data;
  },

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      items: { inventory_id: number; quantity: number }[];
    }>
  ): Promise<Package> {
    const response = await api.put<Package>(`/packages/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/packages/${id}`);
  },
};
