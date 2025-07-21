import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const MobileTabNavigation = ({ activeTab, onTabChange, tabs }) => {
  const activeIndex = tabs.findIndex(tab => tab.value === activeTab);

  return (
    <div className="relative bg-background border-b">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.value === activeTab;
          
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex-1 min-w-[80px] px-3 py-3 flex flex-col items-center gap-1 relative transition-colors",
                "touch-manipulation tap-highlight-transparent",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
              
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  layoutId="activeMobileTab"
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Swipe indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
        {tabs.map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              index === activeIndex ? "w-4 bg-primary" : "w-1 bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileTabNavigation;