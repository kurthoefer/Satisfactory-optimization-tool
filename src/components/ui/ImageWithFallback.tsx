import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc = '/images/icons/placeholder.png',
  alt,
  className,
  ...props
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    // Only reset if src actually changed
    if (currentSrc !== src) {
      setError(false);
      setLoading(true);
      setCurrentSrc(src);
    }
  }, [src, currentSrc]);

  return (
    <>
      {loading && !error && <Skeleton className={className} />}

      <img
        key={src} // Force remount when src changes
        alt={alt}
        src={error ? fallbackSrc : src}
        className={`${loading ? 'opacity-0' : ''} ${className}`}
        style={
          loading ? { position: 'absolute', pointerEvents: 'none' } : undefined
        }
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        {...props}
      />
    </>
  );
};
