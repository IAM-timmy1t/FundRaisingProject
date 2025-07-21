import { useEffect, useRef, useState } from 'react';

/**
 * Hook for detecting when an element enters or leaves the viewport
 * Useful for lazy loading, animations, and performance optimization
 * 
 * @param {Object} options - Intersection Observer options
 * @param {number} options.threshold - Percentage of element visible before triggering
 * @param {string} options.rootMargin - Margin around root element
 * @param {boolean} options.freezeOnceVisible - Stop observing once element is visible
 * @returns {Array} [ref, isIntersecting]
 */
export const useIntersectionObserver = ({
  threshold = 0.1,
  rootMargin = '0px',
  freezeOnceVisible = false
} = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If freezeOnceVisible is true and element has already been visible, skip
    if (freezeOnceVisible && hasIntersected) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        
        if (intersecting) {
          setHasIntersected(true);
        }

        // Unobserve if freezeOnceVisible is true
        if (intersecting && freezeOnceVisible) {
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, freezeOnceVisible, hasIntersected]);

  return [ref, freezeOnceVisible ? hasIntersected : isIntersecting];
};

export default useIntersectionObserver;