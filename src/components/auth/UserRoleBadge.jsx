import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Heart, User, Crown } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

/**
 * UserRoleBadge Component
 * Displays user role with appropriate styling and icon
 */
const UserRoleBadge = ({ role = null, size = 'default' }) => {
  const { role: currentUserRole } = useRole();
  const displayRole = role || currentUserRole;

  const roleConfig = {
    donor: {
      label: 'Donor',
      icon: Heart,
      variant: 'default',
      className: 'bg-blue-500 hover:bg-blue-600'
    },
    recipient: {
      label: 'Recipient',
      icon: User,
      variant: 'default',
      className: 'bg-green-500 hover:bg-green-600'
    },
    admin: {
      label: 'Admin',
      icon: Shield,
      variant: 'default',
      className: 'bg-purple-500 hover:bg-purple-600'
    },
    superadmin: {
      label: 'Super Admin',
      icon: Crown,
      variant: 'default',
      className: 'bg-gradient-to-r from-yellow-500 to-orange-500'
    }
  };

  const config = roleConfig[displayRole] || roleConfig.donor;
  const Icon = config.icon;
  
  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    large: 'text-base px-3 py-1'
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1`}
    >
      <Icon className={size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4'} />
      {config.label}
    </Badge>
  );
};

export default UserRoleBadge;