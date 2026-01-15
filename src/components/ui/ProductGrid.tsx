//* Grid container for product tiles within a category

interface ProductGridProps {
  children: React.ReactNode;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ children }) => {
  return (
    <div
      className='
        grid grid-cols-3 gap-3 p-4
        md:grid-cols-4 lg:grid-cols-5
      '
      role='presentation'
    >
      {children}
    </div>
  );
};
