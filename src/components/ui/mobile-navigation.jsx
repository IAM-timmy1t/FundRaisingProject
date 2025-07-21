import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Home,
  Heart,
  Plus,
  User,
  Search,
  Menu,
  X,
  Target,
  Bell,
  Settings,
  HelpCircle
} from 'lucide-react';

/**
 * MobileBottomNav Component
 * Fixed bottom navigation for mobile devices
 */
export const MobileBottomNav = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  const mainNavItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Explore', path: '/campaigns' },
    { icon: Plus, label: 'Create', path: '/campaigns/new', requireAuth: true },
    { icon: Heart, label: 'Donations', path: '/donor/dashboard', requireAuth: true },
    { icon: Menu, label: 'More', action: () => setShowMenu(true) }
  ];

  const moreMenuItems = [
    { icon: User, label: 'Profile', path: '/profile', requireAuth: true },
    { icon: Bell, label: 'Notifications', path: '/notifications', requireAuth: true },
    { icon: Settings, label: 'Settings', path: '/settings', requireAuth: true },
    { icon: HelpCircle, label: 'Support', path: '/support' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item) => {
    if (item.requireAuth && !user) {
      // Trigger login modal
      // This would be handled by your auth context
      return;
    }
    
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-40 sm:hidden">
        <nav className="grid grid-cols-5 h-16">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = item.path && isActive(item.path);
            
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 relative",
                  "transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* More Menu Sheet */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 sm:hidden"
              onClick={() => setShowMenu(false)}
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 sm:hidden"
            >
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">More Options</h3>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  const shouldShow = !item.requireAuth || user;
                  
                  if (!shouldShow) return null;
                  
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        handleNavClick(item);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * MobileTabBar Component
 * Scrollable tab navigation for mobile
 */
export const MobileTabBar = ({ tabs, activeTab, onTabChange, className }) => {
  return (
    <div className={cn(
      "overflow-x-auto scrollbar-hide",
      "border-b bg-background sticky top-0 z-30",
      className
    )}>
      <div className="flex min-w-full px-4">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors relative",
              "border-b-2 whitespace-nowrap",
              activeTab === tab.value
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 text-xs">({tab.count})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * MobileSearchBar Component
 * Optimized search bar for mobile
 */
export const MobileSearchBar = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn(
      "relative transition-all duration-200",
      isFocused && "shadow-lg",
      className
    )}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch();
          }
        }}
        placeholder={placeholder}
        className={cn(
          "w-full h-12 pl-10 pr-4 rounded-lg",
          "bg-muted/50 border border-transparent",
          "focus:bg-background focus:border-primary",
          "transition-all duration-200",
          "text-base" // Larger text for mobile
        )}
      />
    </div>
  );
};

/**
 * MobileFilterChips Component
 * Horizontal scrollable filter chips
 */
export const MobileFilterChips = ({ filters, activeFilters, onFilterToggle, className }) => {
  return (
    <div className={cn(
      "overflow-x-auto scrollbar-hide py-2",
      className
    )}>
      <div className="flex space-x-2 px-4">
        {filters.map((filter) => {
          const isActive = activeFilters.includes(filter.value);
          
          return (
            <button
              key={filter.value}
              onClick={() => onFilterToggle(filter.value)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium",
                "transition-all duration-200 border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary"
              )}
            >
              {filter.label}
              {filter.count !== undefined && (
                <span className="ml-1">({filter.count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default {
  MobileBottomNav,
  MobileTabBar,
  MobileSearchBar,
  MobileFilterChips
};
