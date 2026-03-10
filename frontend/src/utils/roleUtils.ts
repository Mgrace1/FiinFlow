export type UserRole = 'super_admin' | 'admin' | 'finance_manager' | 'staff';

export interface DecodedToken {
  userId: string;
  companyId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

const normalizeRole = (rawRole: string | null | undefined): UserRole | null => {
  const role = String(rawRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (role === 'superadmin') return 'super_admin';
  if (role === 'super_admin') return 'super_admin';
  if (role === 'admin') return 'admin';
  if (role === 'finance_manager') return 'finance_manager';
  if (role === 'finance') return 'finance_manager';
  if (role === 'staff') return 'staff';
  return null;
};

/**
 * Decode JWT token to extract user role
 */
export const decodeToken = (token: string): DecodedToken | null =>{
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded as DecodedToken;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

/**
 * Get user role from stored token
 */
export const getUserRole = (): UserRole | null =>{
  const token = localStorage.getItem('finflow_token');
  if (token) {
    const decoded = decodeToken(token);
    const normalized = normalizeRole(decoded?.role);
    if (normalized) return normalized;
  }
  try {
    const rawUser = localStorage.getItem('finflow_user');
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    return normalizeRole(parsedUser?.role);
  } catch {
    return null;
  }
};

/**
 * Check if user has admin role
 */
export const isAdmin = (): boolean =>{
  const role = getUserRole();
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user has finance manager role
 */
export const isFinanceManager = (): boolean =>{
  const role = getUserRole();
  return role === 'finance_manager';
};

/**
 * Check if user has staff role
 */
export const isStaff = (): boolean =>{
  const role = getUserRole();
  return role === 'staff';
};

/**
 * Check if user has admin or finance manager role
 */
export const hasFinanceAccess = (): boolean =>{
  const role = getUserRole();
  return role === 'admin' || role === 'finance_manager' || role === 'super_admin';
};

/**
 * Check if user has permission for specific action
 */
export const hasPermission = (action: string): boolean =>{
  const role = getUserRole();
  if (!role) return false;

  const permissions: Record<UserRole, string[]>= {
    super_admin: [
      '*',
    ],
    admin: [
      // Full access to everything
      'view:users',
      'create:users',
      'edit:users',
      'delete:users',
      'view:invoices',
      'create:invoices',
      'edit:invoices',
      'delete:invoices',
      'approve:invoices',
      'view:expenses',
      'create:expenses',
      'edit:expenses',
      'delete:expenses',
      'approve:expenses',
      'view:clients',
      'create:clients',
      'edit:clients',
      'delete:clients',
      'view:reports',
      'view:settings',
      'edit:settings',
      'upload:attachments',
    ],
    finance_manager: [
      // Full access to invoices, expenses, clients
      'view:users',
      'view:invoices',
      'create:invoices',
      'edit:invoices',
      'delete:invoices',
      'approve:invoices',
      'view:expenses',
      'create:expenses',
      'edit:expenses',
      'delete:expenses',
      'approve:expenses',
      'view:clients',
      'create:clients',
      'edit:clients',
      'delete:clients',
      'view:reports',
      'upload:attachments',
    ],
    staff: [
      // Limited access - can only create drafts and upload attachments
      'view:invoices',
      'create:invoices', // Can create drafts only
      'view:expenses',
      'create:expenses', // Can create drafts only
      'view:clients',
      'upload:attachments',
    ],
  };

  const rolePermissions = permissions[role] || [];
  return rolePermissions.includes('*') || rolePermissions.includes(action);
};

/**
 * Get role display name
 */
export const getRoleLabel = (role: UserRole): string =>{
  const labels: Record<UserRole, string>= {
    super_admin: 'Super Admin',
    admin: 'Admin',
    finance_manager: 'Finance Manager',
    staff: 'Staff',
  };
  return labels[role] || role;
};

/**
 * Get role badge color classes
 */
export const getRoleBadgeColor = (role: UserRole): string =>{
  const colors: Record<UserRole, string>= {
    super_admin: 'bg-black text-white',
    admin: 'bg-danger-100 text-danger-800',
    finance_manager: 'bg-primary-100 text-primary-800',
    staff: 'bg-gray-100 text-gray-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
};
