import { cn } from '@/lib/cn';

/**
 * A printer with check sheets emerging from the top tray. Used as the
 * empty-state illustration for the Batches list page.
 */
export function BatchesPrinter({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Printer producing a batch of checks"
      className={cn('h-32 w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Output sheet (back) */}
      <rect x="76" y="14" width="88" height="50" rx="2" fill="#ffffff" stroke="#cbd5e1" />
      <line x1="86" y1="28" x2="148" y2="28" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="86" y1="38" x2="138" y2="38" stroke="#e5e7eb" strokeWidth="1" />
      <rect x="124" y="44" width="28" height="10" rx="1" fill="#eff6ff" stroke="#3b82f6" strokeWidth="0.6" />

      {/* Output sheet (front, slightly tilted via offset) */}
      <rect x="80" y="22" width="88" height="50" rx="2" fill="#ffffff" stroke="#94a3b8" />
      <line x1="90" y1="36" x2="152" y2="36" stroke="#cbd5e1" strokeWidth="1" />
      <line x1="90" y1="46" x2="142" y2="46" stroke="#e5e7eb" strokeWidth="1" />
      <rect x="128" y="52" width="28" height="10" rx="1" fill="#eff6ff" stroke="#3b82f6" strokeWidth="0.6" />

      {/* Printer body */}
      <rect x="48" y="76" width="144" height="56" rx="6" fill="#1e293b" />
      <rect x="48" y="76" width="144" height="14" rx="6" fill="#0f172a" />

      {/* Printer slot (paper exit) */}
      <rect x="76" y="76" width="88" height="4" rx="1" fill="#0f172a" />

      {/* Status bar */}
      <rect x="60" y="100" width="50" height="20" rx="2" fill="#0f172a" />
      <circle cx="68" cy="110" r="2.5" fill="#22c55e" />
      <rect x="76" y="106" width="28" height="2" rx="1" fill="#3b82f6" />
      <rect x="76" y="112" width="20" height="2" rx="1" fill="#475569" />

      {/* Buttons */}
      <circle cx="172" cy="110" r="3" fill="#3b82f6" />
      <circle cx="180" cy="110" r="3" fill="#475569" />

      {/* Feet */}
      <rect x="60" y="132" width="10" height="4" rx="1" fill="#0f172a" />
      <rect x="170" y="132" width="10" height="4" rx="1" fill="#0f172a" />
    </svg>
  );
}
