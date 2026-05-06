import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, description, error, id, className, ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={id} className="text-xs font-medium text-gray-700">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        className={cn(
          'h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-500',
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : '',
          className,
        )}
        {...rest}
      />
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : description ? (
        <span className="text-xs text-gray-500">{description}</span>
      ) : null}
    </div>
  );
});
