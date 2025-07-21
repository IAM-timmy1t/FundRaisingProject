import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const LazyImage = ({
  src,
  alt,
  className,
  placeholderSrc,
  onLoad,
  onError,
  loading = 'lazy',
  sizes,
  srcSet,
  aspectRatio,
  objectFit = 'cover',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || null);
  const [imageLoading, setImageLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    let observer;
    const currentImg = imgRef.current;

    if ('IntersectionObserver' in window && currentImg && loading === 'lazy') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadImage();
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before the image enters viewport
        }
      );

      observer.observe(currentImg);
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      loadImage();
    }

    return () => {
      if (observer && currentImg) {
        observer.unobserve(currentImg);
      }
    };
  }, [src]);

  const loadImage = () => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setImageLoading(false);
      setError(false);
      if (onLoad) onLoad();
    };

    img.onerror = () => {
      setError(true);
      setImageLoading(false);
      if (onError) onError();
    };

    img.src = src;
    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;
  };

  // Generate blur placeholder for better UX
  const getPlaceholder = () => {
    if (placeholderSrc) return placeholderSrc;
    
    // Create a low-quality image placeholder (LQIP) effect
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${aspectRatio ? aspectRatio.split(':')[0] : 16} ${aspectRatio ? aspectRatio.split(':')[1] : 9}'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E`;
  };

  if (error) {
    return (
      <div 
        className={cn(
          "bg-gray-100 flex items-center justify-center",
          className
        )}
        style={{ aspectRatio: aspectRatio?.replace(':', '/') }}
      >
        <div className="text-gray-400 text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder/Loading state */}
      {imageLoading && (
        <div 
          className="absolute inset-0 bg-gray-100 animate-pulse"
          style={{ aspectRatio: aspectRatio?.replace(':', '/') }}
        >
          {placeholderSrc && (
            <img
              src={getPlaceholder()}
              alt=""
              className="w-full h-full object-cover filter blur-sm"
              aria-hidden="true"
            />
          )}
        </div>
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={imageSrc || getPlaceholder()}
        alt={alt}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          imageLoading ? "opacity-0" : "opacity-100",
          `object-${objectFit}`
        )}
        style={{ aspectRatio: aspectRatio?.replace(':', '/') }}
        loading={loading}
        sizes={sizes}
        srcSet={srcSet}
        {...props}
      />
    </div>
  );
};

// Export a memoized version for better performance
export default React.memo(LazyImage);

// Utility hook for creating optimized image URLs
export const useOptimizedImageUrl = (originalUrl, options = {}) => {
  const {
    width,
    height,
    quality = 85,
    format = 'webp'
  } = options;

  // If using a service like Cloudinary or Imgix, transform the URL
  // This is a placeholder - implement based on your image service
  const getOptimizedUrl = () => {
    if (!originalUrl) return '';
    
    // Example for Cloudinary-style transformation
    if (originalUrl.includes('cloudinary.com')) {
      const transformations = [];
      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
      transformations.push(`q_${quality}`);
      transformations.push(`f_${format}`);
      
      const parts = originalUrl.split('/upload/');
      return `${parts[0]}/upload/${transformations.join(',')}/if_ar_gt_1:1,c_crop,ar_1:1/${parts[1]}`;
    }
    
    // For Supabase Storage, add transformation parameters
    if (originalUrl.includes('supabase.co/storage')) {
      const params = new URLSearchParams();
      if (width) params.append('width', width);
      if (height) params.append('height', height);
      params.append('quality', quality);
      
      return `${originalUrl}?${params.toString()}`;
    }
    
    return originalUrl;
  };

  return getOptimizedUrl();
};