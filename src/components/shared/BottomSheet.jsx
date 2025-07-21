import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

const BottomSheet = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  height = "auto",
  maxHeight = "90vh",
  closeOnOverlayClick = true,
  showHandle = true,
  showCloseButton = true,
  className,
  snapPoints = [0.9, 0.5],
  defaultSnap = 0,
  hapticFeedback = true
}) => {
  const controls = useAnimation();
  const sheetRef = useRef(null);
  const [currentSnapIndex, setCurrentSnapIndex] = React.useState(defaultSnap);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Initial haptic feedback on open
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hapticFeedback]);

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const shouldClose = info.velocity.y > 500 || (info.velocity.y >= 0 && info.offset.y > 100);
    
    if (shouldClose) {
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
      onClose();
    } else {
      // Snap to nearest snap point
      const windowHeight = window.innerHeight;
      const currentY = info.point.y;
      const relativePosition = currentY / windowHeight;
      
      let nearestSnapIndex = 0;
      let minDistance = Math.abs(relativePosition - (1 - snapPoints[0]));
      
      snapPoints.forEach((point, index) => {
        const distance = Math.abs(relativePosition - (1 - point));
        if (distance < minDistance) {
          minDistance = distance;
          nearestSnapIndex = index;
        }
      });
      
      setCurrentSnapIndex(nearestSnapIndex);
      await controls.start({ y: 0 });
      
      if (hapticFeedback && 'vibrate' in navigator && nearestSnapIndex !== currentSnapIndex) {
        navigator.vibrate(10);
      }
    }
  };

  const sheetVariants = {
    hidden: { y: "100%" },
    visible: {
      y: 0,
      transition: {
        type: "spring",
        damping: 30,
        stiffness: 300
      }
    },
    exit: {
      y: "100%",
      transition: {
        type: "spring",
        damping: 30,
        stiffness: 300
      }
    }
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragElastic={0.2}
            dragConstraints={{ top: 0 }}
            onDragEnd={handleDragEnd}
            animate={controls}
            style={{ 
              height: height === "auto" ? `${snapPoints[currentSnapIndex] * 100}vh` : height,
              maxHeight 
            }}
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-lg z-50",
              "touch-none select-none",
              className
            )}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
            )}
            
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="px-4 pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {title && (
                      <h3 className="text-lg font-semibold leading-6">{title}</h3>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="ml-4 rounded-full p-2 hover:bg-muted transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default BottomSheet;