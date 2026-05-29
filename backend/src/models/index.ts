export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'borrower';
  full_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: number;
  username: string;
  role: string;
  full_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface BorrowerEntity {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserBorrowerEntity {
  user_id: number;
  entity_id: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  search_normalized: string;
  description: string | null;
  total_quantity: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItemResponse {
  id: number;
  name: string;
  description: string | null;
  total_quantity: number;
  available_quantity: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Package {
  id: number;
  name: string;
  search_normalized: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PackageItem {
  package_id: number;
  item_id: number;
  quantity: number;
}

export interface PackageResponse extends Package {
  items: PackageItemDetail[];
}

export interface PackageItemDetail {
  inventory_id: number;
  name: string;
  quantity: number;
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
  created_at: Date;
  updated_at: Date;
}

export interface ReservationItem {
  id: number;
  reservation_id: number;
  item_id: number | null;
  package_id: number | null;
  quantity: number;
}

export interface CreateReservationPayload {
  borrower_entity_id: number;
  pickup_time: string;
  return_time: string;
  start_date: string;
  end_date: string;
  notes?: string;
  items: { inventory_id: number; quantity: number }[];
  packages: { package_id: number; quantity: number }[];
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: Date;
}

export interface AppConfig {
  key: string;
  value: Record<string, unknown>;
  updated_at: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface DashboardStats {
  active_reservations_count: number;
  pending_returns_count: number;
  total_inventory_items: number;
  total_borrower_entities: number;
}
