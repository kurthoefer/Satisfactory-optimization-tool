//* Category section header in the dropdown

interface CategoryHeaderProps {
  children: React.ReactNode;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({ children }) => {
  return (
    <div
      className='
        px-4 py-2
        bg-gray-100 font-bold text-sm text-gray-700
        sticky top-0 z-10
      '
      role='presentation'
    >
      {children}
    </div>
  );
};
