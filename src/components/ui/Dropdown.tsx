//* Dropdown container for autocomplete results

interface DropdownProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  children,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`
        absolute z-10 w-full mt-2
        bg-white border-2 border-gray-300 rounded-lg shadow-lg
        max-h-96 overflow-y-auto
        ${className}
      `}
      role='listbox'
    >
      {children}
    </div>
  );
};
