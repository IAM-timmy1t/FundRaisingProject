/**
 * Mobile Optimization Utilities
 * Centralized utilities for mobile responsiveness across the platform
 */

import { useMediaQuery, useIsMobile, useIsTablet, useOrientation } from '@/hooks/useMediaQuery';

/**
 * Touch-friendly size classes
 * Ensures minimum 44x44px touch targets as per mobile best practices
 */
export const touchClasses = {
  button: {
    sm: 'min-h-[44px] min-w-[44px] px-4 py-2',
    md: 'min-h-[48px] px-6 py-3',
    lg: 'min-h-[52px] px-8 py-4'
  },
  icon: {
    sm: 'h-6 w-6 p-2 min-h-[44px] min-w-[44px]',
    md: 'h-8 w-8 p-2 min-h-[44px] min-w-[44px]',
    lg: 'h-10 w-10 p-3 min-h-[48px] min-w-[48px]'
  }
};

/**
 * Responsive text size classes
 * Ensures readability on mobile devices
 */
export const responsiveText = {
  h1: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
  h2: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
  h3: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
  h4: 'text-base sm:text-lg md:text-xl lg:text-2xl',
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm'
};

/**
 * Responsive spacing classes
 */
export const responsiveSpacing = {
  container: 'px-4 sm:px-6 lg:px-8',
  section: 'py-8 sm:py-12 lg:py-16',
  card: 'p-4 sm:p-6 lg:p-8',
  gap: {
    sm: 'gap-2 sm:gap-3 lg:gap-4',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8'
  }
};

/**
 * Table to card transformation helper
 * Transforms table data into mobile-friendly cards
 */
export const tableToCards = (data, columns) => {
  const isMobile = useIsMobile();
  
  if (!isMobile) {
    return { type: 'table', data, columns };
  }
  
  return {
    type: 'cards',
    data: data.map(row => ({
      ...row,
      _cardDisplay: columns.map(col => ({
        label: col.header,
        value: row[col.accessor],
        formatter: col.formatter
      }))
    }))
  };
};

/**
 * Swipe gesture detection hook
 * Useful for mobile carousels and navigation
 */
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

/**
 * Responsive modal/dialog helper
 * Makes modals full-screen on mobile
 */
export const getModalClasses = (baseClasses = '') => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return `fixed inset-0 w-full h-full ${baseClasses}`;
  }
  
  return `relative max-w-2xl mx-auto ${baseClasses}`;
};

/**
 * Responsive grid helper
 * Automatically adjusts grid columns based on screen size
 */
export const getResponsiveGridCols = (desktopCols = 3) => {
  const breakpoint = useBreakpoint();
  
  const colsMap = {
    xs: 1,
    sm: Math.min(2, desktopCols),
    md: Math.min(2, desktopCols),
    lg: Math.min(3, desktopCols),
    xl: desktopCols,
    '2xl': desktopCols
  };
  
  return `grid-cols-${colsMap[breakpoint]}`;
};

/**
 * Image optimization for mobile
 * Provides responsive image sizes
 */
export const getResponsiveImageSizes = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  if (isMobile) {
    return {
      sizes: '100vw',
      quality: 75,
      loading: 'lazy'
    };
  }
  
  if (isTablet) {
    return {
      sizes: '(max-width: 768px) 100vw, 50vw',
      quality: 80,
      loading: 'lazy'
    };
  }
  
  return {
    sizes: '(max-width: 1200px) 50vw, 33vw',
    quality: 85,
    loading: 'lazy'
  };
};

/**
 * Scroll lock for mobile modals
 * Prevents background scrolling when modals are open
 */
export const useScrollLock = (isLocked) => {
  useEffect(() => {
    if (isLocked) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isLocked]);
};

/**
 * Touch-friendly form field classes
 */
export const formFieldClasses = {
  input: 'min-h-[44px] px-3 py-2 text-base',
  select: 'min-h-[44px] px-3 py-2 text-base',
  textarea: 'min-h-[100px] px-3 py-2 text-base',
  checkbox: 'h-5 w-5',
  radio: 'h-5 w-5'
};

/**
 * Mobile-optimized animation durations
 * Faster animations for better mobile performance
 */
export const mobileAnimations = {
  duration: {
    fast: 0.1,
    normal: 0.2,
    slow: 0.3
  },
  transition: {
    fast: 'transition-all duration-100',
    normal: 'transition-all duration-200',
    slow: 'transition-all duration-300'
  }
};

import { useState, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useMediaQuery';

export default {
  touchClasses,
  responsiveText,
  responsiveSpacing,
  tableToCards,
  useSwipeGesture,
  getModalClasses,
  getResponsiveGridCols,
  getResponsiveImageSizes,
  useScrollLock,
  formFieldClasses,
  mobileAnimations
};
