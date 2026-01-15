//* Base input component for the product search

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  return (
    <input
      className={`
        w-full px-4 py-3 text-lg
        border-2 border-gray-300 rounded-lg
        focus:outline-none focus:border-blue-500
        transition-colors
        ${className}
      `}
      {...props}
    />
  );
};
