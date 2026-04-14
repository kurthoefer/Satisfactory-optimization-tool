import React, { useState } from 'react';
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

  return (
    // Parent must be position:relative for the skeleton to size correctly
    // while the loading img is position:absolute
    <>
      {loading && !error && <Skeleton className={className} />}

      <img
        key={src}
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
