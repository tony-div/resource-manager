import api from './api';
import { Reservation, PaginatedResponse } from '../types';

export const reservationService = {
  async findAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    borrower_entity_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedResponse<Reservation>> {
    const response = await api.get<PaginatedResponse<Reservation>>(
      '/reservations',
      { params }
    );
    return response.data;
  },

  async findById(id: number): Promise<Reservation> {
    const response = await api.get<Reservation>(`/reservations/${id}`);
    return response.data;
  },

  async create(data: {
    borrower_entity_id: number;
    pickup_time: string;
    return_time: string;
    start_date: string;
    end_date: string;
    notes?: string;
    items: { inventory_id: number; quantity: number }[];
    packages: { package_id: number; quantity: number }[];
  }): Promise<Reservation> {
    const response = await api.post<Reservation>('/reservations', data);
    return response.data;
  },

  async update(
    id: number,
    data: Partial<{
      borrower_entity_id: number;
      pickup_time: string;
      return_time: string;
      start_date: string;
      end_date: string;
      notes: string;
    }>
  ): Promise<Reservation> {
    const response = await api.put<Reservation>(`/reservations/${id}`, data);
    return response.data;
  },

  async cancel(id: number): Promise<void> {
    await api.delete(`/reservations/${id}`);
  },

  async markReturned(id: number, notes?: string): Promise<void> {
    await api.post(`/reservations/${id}/return`, { notes });
  },
};
