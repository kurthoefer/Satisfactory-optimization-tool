import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      // TEMPORARY debug styling — revert to a neutral shimmer when done testing
      className={`animate-pulse rounded bg-fuchsia-600 border-2 border-dashed border-lime-300 ${className}`}
      {...props}
    />
  );
};
