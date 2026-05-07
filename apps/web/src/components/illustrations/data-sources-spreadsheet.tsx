import { cn } from '@/lib/cn';

/**
 * A spreadsheet/CSV with a column-mapping arrow pointing into a check
 * field. Used as the empty-state illustration for the Data sources page.
 */
export function DataSourcesSpreadsheet({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Spreadsheet rows mapped to a check"
      className={cn('h-32 w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Spreadsheet card */}
      <rect x="14" y="22" width="124" height="116" rx="4" fill="#ffffff" stroke="#cbd5e1" />

      {/* Header row */}
      <rect x="14" y="22" width="124" height="14" rx="4" fill="#f1f5f9" />
      <text x="22" y="32" fontSize="6" fill="#475569" fontFamily="ui-monospace, monospace">payee</text>
      <text x="62" y="32" fontSize="6" fill="#475569" fontFamily="ui-monospace, monospace">amount</text>
      <text x="102" y="32" fontSize="6" fill="#475569" fontFamily="ui-monospace, monospace">memo</text>

      {/* Column dividers */}
      <line x1="56" y1="22" x2="56" y2="138" stroke="#e5e7eb" strokeWidth="0.6" />
      <line x1="96" y1="22" x2="96" y2="138" stroke="#e5e7eb" strokeWidth="0.6" />

      {/* Rows */}
      {[48, 60, 72, 84, 96, 108, 120].map((y, i) => (
        <g key={y}>
          <line x1="14" y1={y} x2="138" y2={y} stroke="#f1f5f9" strokeWidth="0.6" />
          <rect x="20" y={y - 8} width="30" height="3" rx="1" fill={i === 0 ? '#3b82f6' : '#cbd5e1'} />
          <rect x="62" y={y - 8} width="22" height="3" rx="1" fill={i === 0 ? '#3b82f6' : '#cbd5e1'} />
          <rect x="100" y={y - 8} width="30" height="3" rx="1" fill="#e5e7eb" />
        </g>
      ))}

      {/* Mapping arrow */}
      <path
        d="M 142 56 C 158 56, 158 76, 174 76"
        stroke="#3b82f6"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="3 3"
      />
      <polygon points="172,72 178,76 172,80" fill="#3b82f6" />

      {/* Check (target) */}
      <rect x="174" y="58" width="56" height="36" rx="3" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.2" />
      <line x1="180" y1="70" x2="216" y2="70" stroke="#cbd5e1" strokeWidth="0.8" />
      <rect x="200" y="76" width="20" height="10" rx="1" fill="#eff6ff" stroke="#3b82f6" strokeWidth="0.6" />
      <text x="210" y="83" textAnchor="middle" fontSize="5" fill="#1d4ed8" fontFamily="ui-monospace, monospace">$</text>
    </svg>
  );
}
