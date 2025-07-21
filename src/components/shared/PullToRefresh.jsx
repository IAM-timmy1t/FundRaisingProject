import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PullToRefresh = ({ 
  onRefresh, 
  children, 
  threshold = 80,
  refreshText = "Pull to refresh",
  releaseText = "Release to refresh",
  loadingText = "Refreshing...",
  className 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (containerRef.current.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (touchStart === 0 || isRefreshing) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStart;
    
    if (distance > 0 && containerRef.current.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
      
      if (distance > threshold) {
        setCanRefresh(true);
        // Haptic feedback on threshold
        if ('vibrate' in navigator && distance === threshold + 1) {
          navigator.vibrate(10);
        }
      } else {
        setCanRefresh(false);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible while refreshing
      
      // Haptic feedback on release
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    
    setTouchStart(0);
    setCanRefresh(false);
  };

  const getIndicatorText = () => {
    if (isRefreshing) return loadingText;
    if (canRefresh) return releaseText;
    return refreshText;
  };

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto h-full", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: pullDistance, 
              opacity: pullProgress
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background z-10"
          >
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ 
                  rotate: isRefreshing ? 360 : pullProgress * 180,
                  scale: 0.8 + pullProgress * 0.2
                }}
                transition={{ 
                  rotate: {
                    duration: isRefreshing ? 1 : 0,
                    repeat: isRefreshing ? Infinity : 0,
                    ease: "linear"
                  }
                }}
              >
                <RefreshCw 
                  className={cn(
                    "h-6 w-6 transition-colors",
                    canRefresh ? "text-primary" : "text-muted-foreground"
                  )} 
                />
              </motion.div>
              <span className={cn(
                "text-xs transition-colors",
                canRefresh ? "text-primary" : "text-muted-foreground"
              )}>
                {getIndicatorText()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;