import { useState, useEffect, useRef, useCallback } from 'react';

export const usePullToRefresh = ({ 
  onRefresh, 
  threshold = 80, 
  enabled = true 
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (!enabled || isRefreshing) return;
    
    const touch = e.touches[0];
    startY.current = touch.pageY;
    currentY.current = touch.pageY;
    
    // Only start pulling if we're at the top of the page
    if (window.scrollY === 0) {
      pulling.current = true;
    }
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !pulling.current || isRefreshing) return;
    
    const touch = e.touches[0];
    currentY.current = touch.pageY;
    const distance = currentY.current - startY.current;
    
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(distance);
      setIsPulling(true);
    }
  }, [enabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !pulling.current || isRefreshing) return;
    
    pulling.current = false;
    const distance = currentY.current - startY.current;
    
    if (distance >= threshold && window.scrollY === 0) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setIsPulling(false);
  }, [enabled, isRefreshing, threshold, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isPulling,
    pullDistance,
    isRefreshing
  };
};