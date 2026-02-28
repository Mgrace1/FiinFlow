import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole, type UserRole } from '../../utils/roleUtils';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  redirect?: boolean;
}

/**
 * Component to protect routes or UI elements based on user role
 *
 * @param children - Content to render if user has required role
 * @param allowedRoles - Array of roles that are allowed to see the content
 * @param fallback - Optional fallback content to show if user doesn't have required role
 * @param redirect - If true, redirects to dashboard instead of showing fallback
 *
 * @example
 * // Protect a route
 * <RequireRole allowedRoles={['admin']} redirect>
 * <AdminPanel />
 * </RequireRole>
 *
 * @example
 * // Hide a button for non-admins
 * <RequireRole allowedRoles={['admin', 'finance_manager']}>
 * <button>Delete Invoice</button>
 * </RequireRole>
 *
 * @example
 * // Show alternative content
 * <RequireRole
 *   allowedRoles={['admin']}
 *   fallback={<p>You need admin access</p>}
 * >
 * <AdminSettings />
 * </RequireRole>
 */
const RequireRole: React.FC<RequireRoleProps>= ({
  children,
  allowedRoles,
  fallback = null,
  redirect = false,
}) =>{
  const userRole = getUserRole();

  // If no role found (not logged in), redirect to login
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }


  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    if (redirect) {
    
      const companyId = localStorage.getItem('finflow_companyId');
      return <Navigate to={`/company/${companyId}/dashboard`} replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RequireRole;
