import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ImageWithFallbackProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
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

  useEffect(() => {
    setError(false);
    setLoading(true);
  }, [src]);

  return (
    <>
      {/* DRY VICTORY: We reuse the Skeleton primitive here.
         We pass 'className' through so it matches the image's dimensions.
      */}
      {loading && !error && <Skeleton className={className} />}

      <img
        alt={alt}
        src={error ? fallbackSrc : src}
        className={`${
          loading ? 'w-0 h-0 opacity-0 absolute' : ''
        } ${className}`}
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

/*
* see the "loading skeleton"

        onLoad={() => {
* Artificial 2-second delay to visualize the skeleton
          setTimeout(() => {
            setLoading(false);
          }, 2000); 
        }}


*/
