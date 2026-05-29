import api from './api';
import { LoginResponse } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
