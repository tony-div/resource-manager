import api from './api';
import { InventoryItem, PaginatedResponse } from '../types';

export const inventoryService = {
  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<PaginatedResponse<InventoryItem>> {
    const response = await api.get<PaginatedResponse<InventoryItem>>('/inventory', {
      params,
    });
    return response.data;
  },

  async findById(id: number): Promise<InventoryItem> {
    const response = await api.get<InventoryItem>(`/inventory/${id}`);
    return response.data;
  },

  async create(data: {
    name: string;
    description?: string;
    total_quantity: number;
  }): Promise<InventoryItem> {
    const response = await api.post<InventoryItem>('/inventory', data);
    return response.data;
  },

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      total_quantity: number;
    }>
  ): Promise<InventoryItem> {
    const response = await api.put<InventoryItem>(`/inventory/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/inventory/${id}`);
  },
};
