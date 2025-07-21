import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

/**
 * Mobile-optimized wrapper for Recharts components
 * Handles touch interactions, proper sizing, and performance optimizations
 */
const MobileChartWrapper = ({
  children,
  height = 250,
  className = '',
  enableTouch = true,
  showLoader = false,
  minHeight = 200,
  maxHeight = 400
}) => {
  const chartHeight = Math.max(minHeight, Math.min(height, maxHeight));

  return (
    <div 
      className={cn(
        'relative w-full overflow-hidden',
        'touch-manipulation', // Improves touch performance
        className
      )}
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
      
      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
    </div>
  );
};

export default MobileChartWrapper;