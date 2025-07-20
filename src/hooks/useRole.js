import { useMemo } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';

/**
 * Custom hook for role and permission management
 * Provides easy access to role-based authorization checks
 */
export const useRole = () => {
  const { userRole, checkRole, checkIsAdmin, checkPermission, authConfig } = useAuth();

  const roleChecks = useMemo(() => ({
    // Check if user has specific role
    isDonor: userRole === authConfig.roles.DONOR,
    isRecipient: userRole === authConfig.roles.RECIPIENT,
    isAdmin: userRole === authConfig.roles.ADMIN,
    isSuperAdmin: userRole === authConfig.roles.SUPERADMIN,
    
    // Check if user has admin privileges (admin or superadmin)
    hasAdminAccess: userRole === authConfig.roles.ADMIN || userRole === authConfig.roles.SUPERADMIN,
    
    // Current user role
    role: userRole,
    
    // Available roles
    roles: authConfig.roles,
    
    // Check methods
    checkRole,
    checkIsAdmin,
    checkPermission,
    
    // Helper to check multiple permissions
    hasAnyPermission: (permissions) => {
      return permissions.some(permission => checkPermission(permission));
    },
    
    // Helper to check all permissions
    hasAllPermissions: (permissions) => {
      return permissions.every(permission => checkPermission(permission));
    },
    
    // Get all permissions for current role
    permissions: authConfig.permissions[userRole] || []
  }), [userRole, checkRole, checkIsAdmin, checkPermission, authConfig]);

  return roleChecks;
};

export default useRole;