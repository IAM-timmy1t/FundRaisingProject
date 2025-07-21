import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MobileModal Component
 * Full-screen modal on mobile, centered modal on desktop
 * 
 * @param {Boolean} isOpen - Modal open state
 * @param {Function} onClose - Close handler
 * @param {String} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {String} className - Additional classes
 * @param {Boolean} showCloseButton - Show close button
 * @param {Boolean} preventClose - Prevent closing on backdrop click
 * @param {ReactNode} footer - Modal footer content
 * @param {String} size - Modal size: 'sm', 'md', 'lg', 'xl', 'full'
 */
const MobileModal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  preventClose = false,
  footer,
  size = 'md',
  mobileFullHeight = true,
  desktopMaxHeight = '90vh'
}) => {
  const isMobile = useIsMobile();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !preventClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, preventClose]);

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-xl',
    xl: 'sm:max-w-2xl',
    full: 'sm:max-w-full sm:m-4'
  };

  const modalVariants = {
    hidden: isMobile 
      ? { y: '100%', opacity: 0 }
      : { scale: 0.95, opacity: 0 },
    visible: isMobile
      ? { y: 0, opacity: 1 }
      : { scale: 1, opacity: 1 },
    exit: isMobile
      ? { y: '100%', opacity: 0 }
      : { scale: 0.95, opacity: 0 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={!preventClose ? onClose : undefined}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                "relative w-full bg-background rounded-t-2xl sm:rounded-lg shadow-xl",
                isMobile ? "h-full max-h-[90vh]" : sizeClasses[size],
                !isMobile && `max-h-[${desktopMaxHeight}]`,
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-background z-10 px-4 sm:px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    {title}
                  </h2>
                  {showCloseButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  )}
                </div>

                {/* Mobile drag indicator */}
                {isMobile && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/20 rounded-full" />
                )}
              </div>

              {/* Content */}
              <div 
                className={cn(
                  "overflow-y-auto px-4 sm:px-6 py-4 sm:py-6",
                  isMobile && mobileFullHeight 
                    ? "min-h-[calc(90vh-8rem)]" 
                    : ""
                )}
                style={{
                  maxHeight: isMobile 
                    ? 'calc(90vh - 8rem)' 
                    : `calc(${desktopMaxHeight} - 8rem)`
                }}
              >
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="sticky bottom-0 bg-background border-t px-4 sm:px-6 py-3 sm:py-4">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * MobileDrawer Component
 * Slide-up drawer for mobile, converted to modal on desktop
 */
export const MobileDrawer = ({
  isOpen,
  onClose,
  title,
  children,
  height = '70vh',
  showHandle = true
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <MobileModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="md"
      >
        {children}
      </MobileModal>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { velocity }) => {
              if (velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-xl z-50"
            style={{ height }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center py-2">
                <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="px-4 pb-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: `calc(${height} - 5rem)` }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileModal;
