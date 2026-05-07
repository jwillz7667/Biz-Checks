import { cn } from '@/lib/cn';

/**
 * Designer canvas with a check sketched on a grid — the empty-state
 * illustration for the Templates page. Intentionally drawn as line art on a
 * subtle grid so it reads as "blueprint / draft" rather than a finished
 * artifact.
 */
export function TemplatesBlueprint({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Sketch of a check on a designer canvas"
      className={cn('h-32 w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="bp-grid" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="12" y="12" width="216" height="136" rx="6" fill="#f9fafb" stroke="#cbd5e1" />
      <rect x="12" y="12" width="216" height="136" rx="6" fill="url(#bp-grid)" />

      {/* Check outline */}
      <rect x="36" y="36" width="168" height="86" rx="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.2" />

      {/* Payee line */}
      <line x1="48" y1="62" x2="120" y2="62" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="48" y1="74" x2="160" y2="74" stroke="#cbd5e1" strokeWidth="1" />

      {/* Amount box */}
      <rect x="158" y="54" width="40" height="14" rx="2" fill="#eff6ff" stroke="#3b82f6" strokeWidth="0.8" />
      <text x="178" y="64" textAnchor="middle" fontSize="7" fill="#1d4ed8" fontFamily="ui-monospace, monospace">
        $
      </text>

      {/* MICR line */}
      <rect x="48" y="100" width="148" height="10" rx="1" fill="#f1f5f9" stroke="#94a3b8" strokeDasharray="2 2" strokeWidth="0.6" />

      {/* Selection handles on the amount box */}
      <circle cx="158" cy="54" r="2" fill="#2563eb" />
      <circle cx="198" cy="54" r="2" fill="#2563eb" />
      <circle cx="158" cy="68" r="2" fill="#2563eb" />
      <circle cx="198" cy="68" r="2" fill="#2563eb" />
    </svg>
  );
}
