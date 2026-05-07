import { cn } from '@/lib/cn';

/**
 * A small stack of issued checks with a single voucher visible on top.
 * Used as the empty-state illustration for the Checks list page.
 */
export function ChecksStack({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Stack of issued checks"
      className={cn('h-32 w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Back checks (offset stack) */}
      <rect x="44" y="36" width="160" height="84" rx="4" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="40" y="44" width="160" height="84" rx="4" fill="#ffffff" stroke="#cbd5e1" />

      {/* Front check */}
      <rect x="36" y="52" width="168" height="84" rx="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.2" />

      {/* Pay To line */}
      <text x="48" y="76" fontSize="6" fill="#94a3b8" fontFamily="Inter, sans-serif">
        PAY TO
      </text>
      <line x1="48" y1="84" x2="160" y2="84" stroke="#cbd5e1" strokeWidth="1" />

      {/* Amount in box */}
      <rect x="160" y="68" width="40" height="14" rx="2" fill="#eff6ff" stroke="#3b82f6" strokeWidth="0.8" />
      <text x="180" y="78" textAnchor="middle" fontSize="7" fill="#1d4ed8" fontFamily="ui-monospace, monospace">
        $1,250.00
      </text>

      {/* Memo + signature line */}
      <line x1="48" y1="108" x2="100" y2="108" stroke="#e5e7eb" strokeWidth="0.8" />
      <line x1="120" y1="108" x2="196" y2="108" stroke="#cbd5e1" strokeWidth="0.8" />

      {/* Tiny check mark badge */}
      <circle cx="196" cy="60" r="8" fill="#22c55e" />
      <path d="M192 60 L195 63 L201 57" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
