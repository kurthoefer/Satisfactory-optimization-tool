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
        absolute z-10 w-full mt-1
        bg-white border border-slate-300 rounded-md shadow-lg
        max-h-96 overflow-y-auto
        ${className}
      `}
      role='listbox'
    >
      {children}
    </div>
  );
};
