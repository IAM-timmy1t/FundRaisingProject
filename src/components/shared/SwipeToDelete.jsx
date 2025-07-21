import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SwipeToDelete = ({ 
  children, 
  onDelete, 
  deleteThreshold = 100,
  deleteText = "Delete",
  className,
  confirmDelete = true,
  hapticFeedback = true
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const containerRef = useRef(null);
  const controls = useAnimation();
  const x = useMotionValue(0);
  
  const deleteProgress = useTransform(x, [-deleteThreshold, 0], [1, 0]);
  const deleteOpacity = useTransform(deleteProgress, [0, 0.5, 1], [0, 0.5, 1]);
  const deleteScale = useTransform(deleteProgress, [0, 0.5, 1], [0.8, 0.9, 1]);

  const handleDragEnd = async (event, info) => {
    const shouldDelete = info.offset.x < -deleteThreshold;
    
    if (shouldDelete && !isDeleting) {
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
      
      if (confirmDelete) {
        setShowConfirm(true);
        await controls.start({ x: -deleteThreshold });
      } else {
        handleDelete();
      }
    } else {
      await controls.start({ x: 0 });
      setShowConfirm(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate([20, 10, 20]);
    }
    
    await controls.start({ 
      x: -window.innerWidth,
      transition: { duration: 0.3 }
    });
    
    await controls.start({ 
      height: 0,
      opacity: 0,
      transition: { duration: 0.2 }
    });
    
    onDelete();
  };

  const handleCancel = async () => {
    await controls.start({ x: 0 });
    setShowConfirm(false);
  };

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Delete background */}
      <motion.div
        className="absolute inset-0 bg-destructive flex items-center justify-end px-4"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div
          className="flex items-center gap-2 text-destructive-foreground"
          style={{ scale: deleteScale }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="font-medium">{deleteText}</span>
        </motion.div>
      </motion.div>
      
      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragElastic={0.2}
        dragConstraints={{ left: -deleteThreshold * 1.5, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-background"
      >
        {children}
      </motion.div>
      
      {/* Confirmation overlay */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center gap-2 p-4"
        >
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md font-medium"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium"
            disabled={isDeleting}
          >
            Cancel
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default SwipeToDelete;