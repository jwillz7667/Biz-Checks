import { cn } from '@/lib/cn';

/**
 * Stylized SVG check mockup used as the marketing hero visual.
 * Pure SVG — no images, no client JS, fast first paint.
 */
export function CheckMockup({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 720 320"
      role="img"
      aria-label="A business check rendered in the BizChecks designer with the amount box selected"
      className={cn('h-auto w-full', className)}
    >
      <defs>
        <linearGradient id="check-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="check-watermark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dbeafe" stopOpacity="0.5" />
          <stop offset="1" stopColor="#eff6ff" stopOpacity="0" />
        </linearGradient>
        <pattern id="micr-noise" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#fafafa" />
        </pattern>
      </defs>

      {/* Drop shadow */}
      <rect x="14" y="20" width="692" height="280" rx="14" fill="#0f172a" opacity="0.06" />
      <rect x="10" y="14" width="692" height="280" rx="14" fill="#0f172a" opacity="0.04" />

      {/* Check paper */}
      <rect x="6" y="6" width="692" height="280" rx="14" fill="url(#check-paper)" stroke="#e5e7eb" />

      {/* Watermark wash */}
      <ellipse cx="540" cy="100" rx="260" ry="120" fill="url(#check-watermark)" />

      {/* Org block (top-left) */}
      <rect x="28" y="28" width="44" height="44" rx="8" fill="#1d4ed8" />
      <text x="50" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill="#ffffff" fontFamily="Inter, system-ui, sans-serif">
        B
      </text>
      <text x="84" y="44" fontSize="13" fontWeight="700" fill="#0f172a" fontFamily="Inter, system-ui, sans-serif">
        Beacon Logistics, Inc.
      </text>
      <text x="84" y="60" fontSize="10" fill="#64748b" fontFamily="Inter, system-ui, sans-serif">
        220 Market St · San Francisco, CA 94105
      </text>

      {/* Check number + date (top-right) */}
      <text x="672" y="44" fontSize="11" fill="#64748b" textAnchor="end" fontFamily="Inter, system-ui, sans-serif">
        CHECK No.
      </text>
      <text x="672" y="62" fontSize="18" fontWeight="700" fill="#0f172a" textAnchor="end" fontFamily="JetBrains Mono, monospace">
        004821
      </text>
      <text x="672" y="80" fontSize="10" fill="#64748b" textAnchor="end" fontFamily="Inter, system-ui, sans-serif">
        DATE  2026-05-06
      </text>

      {/* Pay to the order of */}
      <text x="28" y="118" fontSize="10" fontWeight="600" fill="#475569" fontFamily="Inter, system-ui, sans-serif">
        PAY TO THE ORDER OF
      </text>
      <line x1="28" y1="138" x2="500" y2="138" stroke="#cbd5e1" strokeWidth="1" />
      <text x="36" y="134" fontSize="15" fontWeight="600" fill="#0f172a" fontFamily="Inter, system-ui, sans-serif">
        Pacific Freight Partners
      </text>

      {/* Amount box (highlighted as "selected") */}
      <rect x="514" y="106" width="172" height="38" rx="6" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
      <text x="676" y="132" fontSize="18" fontWeight="700" fill="#0f172a" textAnchor="end" fontFamily="JetBrains Mono, monospace">
        $ 12,480.00
      </text>
      {/* Selection handles */}
      <g fill="#2563eb">
        <rect x="510" y="102" width="6" height="6" rx="1" />
        <rect x="684" y="102" width="6" height="6" rx="1" />
        <rect x="510" y="142" width="6" height="6" rx="1" />
        <rect x="684" y="142" width="6" height="6" rx="1" />
      </g>
      {/* Selection label */}
      <g>
        <rect x="514" y="84" width="92" height="18" rx="4" fill="#2563eb" />
        <text x="560" y="97" fontSize="10" fontWeight="600" fill="#ffffff" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
          Amount · L#Amount
        </text>
      </g>

      {/* Written-out amount */}
      <text x="28" y="172" fontSize="13" fill="#0f172a" fontFamily="Inter, system-ui, sans-serif">
        Twelve thousand four hundred eighty and 00/100
      </text>
      <line x1="28" y1="180" x2="500" y2="180" stroke="#cbd5e1" strokeWidth="1" />
      <text x="510" y="172" fontSize="11" fill="#64748b" fontFamily="Inter, system-ui, sans-serif">
        DOLLARS
      </text>

      {/* Memo */}
      <text x="28" y="212" fontSize="9" fontWeight="600" fill="#475569" fontFamily="Inter, system-ui, sans-serif">
        MEMO
      </text>
      <line x1="64" y1="212" x2="320" y2="212" stroke="#cbd5e1" strokeWidth="1" />
      <text x="68" y="208" fontSize="11" fill="#0f172a" fontFamily="Inter, system-ui, sans-serif">
        INV-2026-0481
      </text>

      {/* Signature */}
      <line x1="420" y1="212" x2="676" y2="212" stroke="#cbd5e1" strokeWidth="1" />
      <text x="420" y="226" fontSize="9" fontWeight="600" fill="#475569" fontFamily="Inter, system-ui, sans-serif">
        AUTHORIZED SIGNATURE
      </text>
      <path
        d="M 440 204 Q 460 188 478 200 T 524 198 Q 548 192 568 206 T 614 198"
        fill="none"
        stroke="#1e293b"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* MICR clear-band guide */}
      <rect x="6" y="246" width="692" height="40" fill="url(#micr-noise)" />
      <line x1="6" y1="246" x2="698" y2="246" stroke="#e2e8f0" strokeDasharray="4 4" />

      {/* MICR line */}
      <text x="40" y="274" fontSize="18" fill="#0a0a0a" letterSpacing="2" fontFamily="JetBrains Mono, monospace">
        ⑆ 121000248 ⑆ 0123456789 ⑈ 004821
      </text>
    </svg>
  );
}
