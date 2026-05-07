import { cn } from '@/lib/cn';

/**
 * A fountain pen mid-signature on a check. Available for marketing surfaces
 * (FeaturesGrid, HowItWorks) and as a generic "signing in progress" icon.
 */
export function SignaturePen({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="A fountain pen signing a check"
      className={cn('h-32 w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Check */}
      <rect x="20" y="40" width="200" height="90" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />

      {/* Header lines */}
      <line x1="32" y1="58" x2="120" y2="58" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="32" y1="70" x2="160" y2="70" stroke="#e5e7eb" strokeWidth="1" />

      {/* Amount box */}
      <rect x="156" y="50" width="50" height="14" rx="2" fill="#eff6ff" stroke="#3b82f6" strokeWidth="0.8" />
      <text x="181" y="60" textAnchor="middle" fontSize="7" fill="#1d4ed8" fontFamily="ui-monospace, monospace">
        $
      </text>

      {/* Signature baseline */}
      <line x1="120" y1="106" x2="208" y2="106" stroke="#94a3b8" strokeWidth="0.8" />

      {/* Handwritten signature stroke (Bezier squiggle) */}
      <path
        d="M 124 102 C 132 92, 138 110, 146 102 C 154 94, 162 108, 170 100 C 178 92, 184 106, 192 100"
        stroke="#1a1a2e"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Pen body */}
      <g transform="translate(192 90) rotate(38)">
        <rect x="0" y="0" width="60" height="6" rx="1.5" fill="#1e293b" />
        <rect x="0" y="0" width="14" height="6" rx="1.5" fill="#3b82f6" />
        <polygon points="60,0 70,3 60,6" fill="#0f172a" />
        <line x1="68" y1="3" x2="74" y2="3" stroke="#1a1a2e" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
