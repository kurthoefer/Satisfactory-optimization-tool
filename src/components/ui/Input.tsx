//* Base input component for the product search
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
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
  },
);

Input.displayName = 'Input';
