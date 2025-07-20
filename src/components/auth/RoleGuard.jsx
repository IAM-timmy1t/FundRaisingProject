import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { Loader2 } from 'lucide-react';

/**
 * RoleGuard Component
 * Protects routes based on user roles and permissions
 * 
 * @param {string|array} roles - Required role(s) to access the route
 * @param {string} permission - Required permission to access the route
 * @param {React.Component} fallback - Component to show while checking permissions
 * @param {string} redirectTo - Path to redirect if access denied
 */
const RoleGuard = ({ 
  children, 
  roles = [], 
  permission = null,
  fallback = null,
  redirectTo = '/'
}) => {
  const { user, userRole, loading, checkPermission } = useAuth();

  // Show loading state
  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Convert single role to array for consistency
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  // Check role-based access
  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check permission-based access
  if (permission && !checkPermission(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Access granted
  return children;
};

export default RoleGuard;

// Usage examples:
// <RoleGuard roles="admin">
//   <AdminDashboard />
// </RoleGuard>
//
// <RoleGuard roles={["admin", "superadmin"]}>
//   <UserManagement />
// </RoleGuard>
//
// <RoleGuard permission="moderate_campaigns">
//   <ModerationQueue />
// </RoleGuard>