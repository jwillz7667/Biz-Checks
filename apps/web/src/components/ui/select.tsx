import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, description, error, id, className, children, ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={id} className="text-xs font-medium text-gray-700">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={id}
        className={cn(
          'h-9 appearance-none rounded-md border border-gray-300 bg-white bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%236b7280"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>\')] bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.25rem_1.25rem] py-1.5 pl-3 pr-9 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50 disabled:text-gray-500',
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : '',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : description ? (
        <span className="text-xs text-gray-500">{description}</span>
      ) : null}
    </div>
  );
});
