export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'borrower';
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export interface BorrowerEntity {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  description: string | null;
  total_quantity: number;
  available_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageItem {
  inventory_id: number;
  name: string;
  quantity: number;
}

export interface Package {
  id: number;
  name: string;
  description: string | null;
  items: PackageItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: number;
  user_id: number;
  entity_id: number;
  status: 'draft' | 'pending' | 'approved' | 'active' | 'returned' | 'cancelled';
  start_date: string;
  end_date: string;
  pickup_time: string;
  return_time: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: ReservationItem[];
}

export interface ReservationItem {
  id: number;
  reservation_id: number;
  item_id: number | null;
  package_id: number | null;
  quantity: number;
}

export interface DashboardStats {
  active_reservations_count: number;
  pending_returns_count: number;
  total_inventory_items: number;
  total_borrower_entities: number;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface AppConfig {
  company_name?: string;
  default_reservation_days?: number;
  timezone?: string;
  [key: string]: unknown;
}

export type StackParamList = {
  Login: undefined;
  Dashboard: undefined;
  UnifiedInventory: undefined;
  InventoryDetail: { id: number };
  PackageDetail: { id: number };
  CreateReservation: undefined;
  ReservationDetail: { id: number };
  Users: undefined;
  Entities: undefined;
  AuditLogs: undefined;
  Settings: undefined;
};
