import { forwardRef } from 'react';

interface ProductGridProps {
  children: React.ReactNode;
}

export const ProductGrid = forwardRef<HTMLDivElement, ProductGridProps>(
  ({ children }, ref) => {
    return (
      <div
        ref={ref}
        className='
          grid grid-cols-3 gap-3 p-4
          md:grid-cols-4 lg:grid-cols-5
        '
        role='presentation'
      >
        {children}
      </div>
    );
  },
);

ProductGrid.displayName = 'ProductGrid';
