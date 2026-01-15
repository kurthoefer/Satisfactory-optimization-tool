import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      {...props}
    />
  );
};

/*
Text Loading: When you eventually fetch product details from a backend/API,
the text might lag behind. You can simply use:
            <Skeleton className="h-4 w-[250px]" />
to mimic a title bar.


Recipe Calculation: In CalculatorResults.tsx, While the complex math
runs (which can take a few milliseconds to seconds for large factories),
you can replace that entire dashed box with a "Card Skeleton."

"shimmer" effects are often used in modern apps
*/
