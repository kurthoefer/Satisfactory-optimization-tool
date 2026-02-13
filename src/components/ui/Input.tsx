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
          w-full px-4 py-3 text-sm
          border border-slate-300 rounded-md shadow-sm
          focus:outline-none focus:border-slate-500
          transition-colors
          ${className}
        `}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
