export const COLORS = {
  primary: '#1a237e',
  primaryLight: '#534bae',
  primaryDark: '#000051',
  secondary: '#ff6f00',
  background: '#f5f5f5',
  surface: '#ffffff',
  error: '#d32f2f',
  success: '#4caf50',
  warning: '#ff9800',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#e0e0e0',
};

export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm';

export const RESERVATION_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  BORROWER: 'borrower',
} as const;
