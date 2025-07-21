import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  PlusCircle, 
  Heart, 
  User,
  Target,
  LayoutDashboard 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/EnhancedAuthContext';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
      requireAuth: false
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/search',
      requireAuth: false
    },
    {
      id: 'create',
      label: 'Create',
      icon: PlusCircle,
      path: '/campaigns/create',
      requireAuth: true,
      accent: true
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: user ? '/recipient/dashboard' : '/donor/dashboard',
      requireAuth: true
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      requireAuth: true
    }
  ];

  // Filter items based on auth status
  const visibleItems = navItems.filter(item => !item.requireAuth || user);

  // Don't show on certain pages
  const hiddenPaths = ['/payment', '/login', '/signup'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-background/95 backdrop-blur-lg border-t">
        <nav className="flex items-center justify-around px-2 py-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-full py-2 px-1 rounded-lg transition-all",
                  isActive && "text-primary",
                  !isActive && "text-muted-foreground hover:text-foreground",
                  item.accent && "text-primary hover:text-primary"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  />
                )}
                
                <div className="relative">
                  <Icon className={cn(
                    "h-5 w-5 mb-1",
                    item.accent && "h-6 w-6"
                  )} />
                  {item.accent && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                  )}
                </div>
                
                <span className={cn(
                  "text-xs font-medium",
                  item.accent && "font-semibold"
                )}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>
      
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </div>
  );
};

export default MobileBottomNav;