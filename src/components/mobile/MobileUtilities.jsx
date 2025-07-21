import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, PanInfo } from 'framer-motion';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// Haptic feedback utility (using Vibration API)
export const hapticFeedback = {
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 10, 10]);
    }
  },
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 10, 30]);
    }
  }
};

// Swipe to Delete Component
export const SwipeToDelete = ({ 
  children, 
  onDelete, 
  confirmDelete = true,
  threshold = 100,
  className 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const { toast } = useToast();

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const shouldDelete = info.offset.x < -threshold;
    
    if (shouldDelete && !isDeleting) {
      if (confirmDelete) {
        hapticFeedback.medium();
        // Animate to show delete state
        await controls.start({ x: -100, transition: { duration: 0.2 } });
        
        // Show confirmation
        toast({
          title: "Delete item?",
          description: "This action cannot be undone.",
          action: (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  setIsDeleting(true);
                  hapticFeedback.heavy();
                  await controls.start({ x: -window.innerWidth, opacity: 0 });
                  onDelete();
                }}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => controls.start({ x: 0 })}
              >
                Cancel
              </Button>
            </div>
          ),
        });
      } else {
        setIsDeleting(true);
        hapticFeedback.heavy();
        await controls.start({ x: -window.innerWidth, opacity: 0 });
        onDelete();
      }
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative z-10 bg-background"
      >
        {children}
      </motion.div>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 bg-destructive">
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>
    </div>
  );
};

// Pull to Refresh Component
export const PullToRefresh = ({ 
  children, 
  onRefresh,
  threshold = 80,
  className 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStart === 0 || isRefreshing) return;
    
    const touchY = e.touches[0].clientY;
    const pull = touchY - touchStart;
    
    if (pull > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(pull, threshold * 1.5));
      
      if (pull > threshold * 0.5) {
        hapticFeedback.light();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      hapticFeedback.medium();
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setTouchStart(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, pullDistance, isRefreshing]);

  return (
    <div ref={containerRef} className={cn("relative overflow-auto", className)}>
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200"
        style={{
          top: -40,
          height: 40,
          transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
          opacity: pullDistance / threshold,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <RefreshCw 
            className="h-5 w-5 transition-transform"
            style={{
              transform: `rotate(${(pullDistance / threshold) * 180}deg)`,
            }}
          />
        )}
      </div>
      <div
        style={{
          transform: `translateY(${pullDistance * 0.5}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Mobile List Skeleton
export const MobileListSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Mobile Card Skeleton
export const MobileCardSkeleton = () => {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <Skeleton className="h-40 w-full rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
};

// Mobile Metrics Skeleton
export const MobileMetricsSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
};

// Mobile Chart Skeleton
export const MobileChartSkeleton = () => {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="h-48 flex items-end justify-between gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.random() * 100 + 20}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
};

// Touch-optimized Long Press Hook
export const useLongPress = (callback: () => void, delay = 500) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'touchstart') {
      e.persist();
    }
    
    target.current = e.target;
    timeout.current = setTimeout(() => {
      hapticFeedback.medium();
      callback();
      setLongPressTriggered(true);
    }, delay);
  };

  const clear = (e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
    timeout.current && clearTimeout(timeout.current);
    
    if (shouldTriggerClick && !longPressTriggered && target.current) {
      target.current.dispatchEvent(new Event('click', { bubbles: true }));
    }
    
    setLongPressTriggered(false);
  };

  return {
    onTouchStart: (e: React.TouchEvent) => start(e),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onMouseDown: (e: React.MouseEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
  };
};

// Mobile Bottom Sheet Modal (using Drawer from shadcn/ui)
export { Drawer as BottomSheet, DrawerContent as BottomSheetContent } from '@/components/ui/drawer';

// Mobile Action Sheet
export const MobileActionSheet = ({ 
  open, 
  onOpenChange, 
  title,
  actions,
  cancelLabel = "Cancel" 
}) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="px-4 pb-safe">
          {title && (
            <div className="py-4 border-b">
              <h3 className="text-center font-medium">{title}</h3>
            </div>
          )}
          <div className="py-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  hapticFeedback.light();
                  action.onClick();
                  onOpenChange(false);
                }}
                className={cn(
                  "w-full py-4 text-center font-medium transition-colors touch-manipulation",
                  "hover:bg-muted active:bg-muted/80",
                  action.destructive && "text-destructive",
                  index < actions.length - 1 && "border-b"
                )}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </div>
          <div className="border-t pt-2">
            <button
              onClick={() => {
                hapticFeedback.light();
                onOpenChange(false);
              }}
              className="w-full py-4 text-center font-medium hover:bg-muted active:bg-muted/80 touch-manipulation"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// Floating Action Button
export const FloatingActionButton = ({ 
  icon: Icon, 
  onClick, 
  className,
  ...props 
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        hapticFeedback.medium();
        onClick();
      }}
      className={cn(
        "fixed bottom-20 right-4 z-50",
        "h-14 w-14 rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "flex items-center justify-center",
        "touch-manipulation",
        className
      )}
      {...props}
    >
      <Icon className="h-6 w-6" />
    </motion.button>
  );
};

// Mobile-optimized Search Input
export const MobileSearchInput = ({ 
  value, 
  onChange, 
  onClear,
  placeholder = "Search...",
  className 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-12 pl-10 pr-10 text-base",
          "border rounded-lg bg-background",
          "focus:outline-none focus:ring-2 focus:ring-primary",
          "touch-manipulation"
        )}
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      {value && (
        <button
          onClick={() => {
            hapticFeedback.light();
            onClear();
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted touch-manipulation"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default {
  hapticFeedback,
  SwipeToDelete,
  PullToRefresh,
  MobileListSkeleton,
  MobileCardSkeleton,
  MobileMetricsSkeleton,
  MobileChartSkeleton,
  useLongPress,
  MobileActionSheet,
  FloatingActionButton,
  MobileSearchInput,
};