import { cn } from '@/lib/cn';

export function Empty({
  title,
  description,
  action,
  className,
  icon,
  illustration,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  /**
   * Larger SVG illustration shown above the title. Takes precedence over
   * `icon` when both are provided. Pass an element from
   * `@/components/illustrations` for the brand-consistent style.
   */
  illustration?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {illustration ? (
        <div className="mb-5">{illustration}</div>
      ) : icon ? (
        <div className="mb-3 text-gray-400">{icon}</div>
      ) : null}
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
