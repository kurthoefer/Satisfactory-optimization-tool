//TODO size of the icons for the dropdown are controlled by this horrible string bellow lol
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
          grid gap-2 p-3
          grid-cols-[repeat(auto-fill,minmax(40px,1fr))]
        '
        role='presentation'
      >
        {children}
      </div>
    );
  },
);

ProductGrid.displayName = 'ProductGrid';
