import {
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Lock,
  MousePointerSquareDashed,
  Printer,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { CheckMockup } from '@/components/marketing/check-mockup';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden">
      {/* Background flair */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[640px] bg-gradient-to-b from-brand-50/80 via-white to-white" />
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -z-10 h-[520px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-200/40 via-brand-100/30 to-transparent blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28 lg:pt-32">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-medium text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" /> Built for finance teams that print at scale
            </span>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              Design and print business checks at <span className="text-brand-600">production scale.</span>
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-lg text-gray-600">
              BizChecks is the modern check-printing platform for accounting and finance teams. Build
              branded templates in a visual designer, batch-print thousands of checks from a CSV, and stay
              audit-ready with bank-grade encryption and a full action log.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" iconRight={<ArrowRight className="size-4" />}>
                  Start free
                </Button>
              </Link>
              <a href="#designer">
                <Button variant="outline" size="lg">
                  See the designer
                </Button>
              </a>
            </div>

            <ul className="mt-6 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand-600" /> No credit card to start
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand-600" /> SOC 2-friendly audit log
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand-600" /> Multi-tenant by default
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand-600" /> Bring your own check stock
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6">
            <HeroVisual />
          </div>
        </div>

        <TrustStrip />
      </div>
    </section>
  );
}

function HeroVisual(): React.JSX.Element {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-brand-100 via-white to-transparent blur-2xl"
      />
      <div className="relative rounded-2xl border border-gray-200/80 bg-white p-3 shadow-2xl shadow-brand-900/10">
        {/* App-window chrome */}
        <div className="flex items-center justify-between rounded-t-xl bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-300" />
            <span className="size-2.5 rounded-full bg-yellow-300" />
            <span className="size-2.5 rounded-full bg-green-300" />
          </div>
          <div className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] text-gray-500 shadow-sm">
            templates / payroll-q1.template
          </div>
          <span className="text-[10px] font-medium text-gray-500">DRAFT · 8.5 × 3.5 in</span>
        </div>
        <div className="rounded-b-xl bg-canvas-bg p-6">
          <CheckMockup />
        </div>
      </div>

      {/* Floating data-source card */}
      <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-gray-200 bg-white p-3 shadow-xl shadow-brand-900/10 sm:block">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-brand-50 text-brand-700">
            <FileSpreadsheet className="size-4" />
          </span>
          <div>
            <div className="text-xs font-semibold text-gray-900">payroll-q1.csv</div>
            <div className="font-mono text-[10px] text-gray-500">Payee · Amount · Memo · 1,284 rows</div>
          </div>
        </div>
      </div>

      {/* Floating run card */}
      <div className="absolute -top-4 -right-4 hidden rounded-xl border border-gray-200 bg-white p-3 shadow-xl shadow-brand-900/10 lg:block">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="size-4" />
          </span>
          <div>
            <div className="text-xs font-semibold text-gray-900">Batch printed</div>
            <div className="font-mono text-[10px] text-gray-500">1,284 checks · 11.2s</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustStrip(): React.JSX.Element {
  const items = [
    'AES-256-GCM at rest',
    'ABA mod-10 routing checks',
    'Argon2id passwords',
    'Tenant-isolated queries',
    'Idempotent batches',
  ];
  return (
    <div className="mt-20 rounded-2xl border border-gray-200 bg-white/60 p-5 shadow-sm backdrop-blur">
      <div className="grid items-center gap-4 sm:grid-cols-5">
        {items.map((label) => (
          <div
            key={label}
            className="flex items-center justify-center gap-2 border-b border-gray-100 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-600 last:border-b-0 sm:border-b-0 sm:border-r sm:py-0 sm:last:border-r-0"
          >
            <ShieldCheck className="size-3.5 text-brand-600" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Features grid                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: MousePointerSquareDashed,
    title: 'Visual check designer',
    body: 'Drag-and-drop fields, MICR, signatures, logos, and amount boxes. Snap-to-grid, alignment guides, and a live preview that matches what prints.',
  },
  {
    icon: Printer,
    title: 'Batch print from CSV',
    body: 'Upload a spreadsheet, map columns to template fields, and render thousands of checks into a single audit-ready PDF.',
  },
  {
    icon: Lock,
    title: 'Bank-grade encryption',
    body: 'Account numbers and routing numbers are AES-256-GCM encrypted at the application layer with versioned keys for safe rotation.',
  },
  {
    icon: Workflow,
    title: 'Multi-tenant by default',
    body: 'Every query is scoped to your organization at the database layer — not in the handler — so cross-tenant leaks are structurally impossible.',
  },
  {
    icon: Database,
    title: 'Audit log on every action',
    body: 'Mutations record actor, target, and a diff snippet. Investigate what changed, who changed it, and when, without bolting on a second tool.',
  },
  {
    icon: Zap,
    title: 'Idempotent batches',
    body: 'Send the same Idempotency-Key twice and you get the same response. Retry safely without ever printing a check more than once.',
  },
];

export function FeaturesGrid(): React.JSX.Element {
  return (
    <Section id="features" eyebrow="Features" heading="Everything you need to print checks at scale">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-brand-900/5"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Designer showcase                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export function DesignerShowcase(): React.JSX.Element {
  const points = [
    {
      title: 'MICR-aware by construction',
      body: 'The designer knows the 5/8" clear band, validates routing numbers with ABA mod-10, and refuses to publish a template with an invalid layout.',
    },
    {
      title: 'Formulas, not macros',
      body: 'Compose values with a small VB-script-like expression language: L#("Amount"), Date.Today, concatenation, currency formatting — all evaluated at print time.',
    },
    {
      title: 'Real units, real previews',
      body: 'PostScript points end-to-end. What you see in the canvas is exactly what the PDF renderer outputs — same fonts, same MICR encoding, same bytes.',
    },
  ];

  return (
    <Section
      id="designer"
      eyebrow="Designer"
      heading="A visual designer built for production checks"
      description="Build templates in a Konva-powered canvas, version them per template, and ship to the renderer with confidence."
    >
      <div className="grid items-start gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-brand-900/5">
            <div className="grid grid-cols-12 border-b border-gray-200">
              <aside className="col-span-3 border-r border-gray-200 bg-gray-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Layers</div>
                <ul className="mt-2 space-y-1 text-xs">
                  {['Background', 'Org logo', 'Payee', 'Amount box', 'MICR line', 'Signature'].map((l, i) => (
                    <li
                      key={l}
                      className={cn(
                        'flex items-center gap-2 rounded px-2 py-1',
                        i === 3 ? 'bg-brand-100 text-brand-800 font-medium' : 'text-gray-700',
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current opacity-50" />
                      {l}
                    </li>
                  ))}
                </ul>
              </aside>
              <div className="col-span-6 bg-canvas-bg p-4">
                <CheckMockup />
              </div>
              <aside className="col-span-3 border-l border-gray-200 bg-gray-50 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Properties</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                  <PropRow label="X" value="6.42 in" />
                  <PropRow label="Y" value="1.40 in" />
                  <PropRow label="W" value="1.70 in" />
                  <PropRow label="H" value="0.35 in" />
                  <PropRow label="Font" value="Inter Bold" />
                  <PropRow label="Size" value="14 pt" />
                  <PropRow label="Align" value="Right" />
                  <PropRow label="Color" value="#000" />
                </dl>
                <div className="mt-3 rounded-md border border-brand-200 bg-brand-50 p-2 text-[10px] font-medium text-brand-800">
                  Bound to L#Amount
                </div>
              </aside>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-3 py-2 text-[10px] text-gray-500">
              <span>Snap · 1/8 in</span>
              <span className="font-mono">100% · 612 × 252 pt</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Saved
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <ul className="space-y-7">
            {points.map((p) => (
              <li key={p.title}>
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="size-3.5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{p.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{p.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function PropRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-mono text-gray-800">{value}</dd>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Security                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const SECURITY_ITEMS = [
  {
    icon: Lock,
    title: 'Field-level encryption',
    body: 'Account numbers and routing numbers encrypted at the application layer with AES-256-GCM. Per-row key version makes rotation non-breaking.',
  },
  {
    icon: ShieldCheck,
    title: 'Argon2id authentication',
    body: 'Modern memory-hard password hashing, 15-minute access tokens, and rotated, hashed-at-rest refresh tokens.',
  },
  {
    icon: Workflow,
    title: 'Tenant isolation at the query layer',
    body: 'Every Prisma query takes tenantId as the first argument. No handler can reach data outside its own organization.',
  },
  {
    icon: Database,
    title: 'Audit log',
    body: 'Every mutating request records actor, target, and a diff. Read-only handlers stay quiet. Investigations stop being archaeology.',
  },
];

export function SecuritySection(): React.JSX.Element {
  return (
    <Section
      id="security"
      eyebrow="Security"
      heading="Bank-grade by default, not as an upsell"
      description="Security primitives are wired into the architecture, not bolted on. You inherit them whether you ship one check or one million."
      tone="dark"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {SECURITY_ITEMS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition-colors hover:border-white/20"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/30">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-300">{body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* How it works                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: '01',
    title: 'Design your template',
    body: 'Start from a blank check or one of the canonical stock blueprints. Drag in fields, position the MICR line, place your signature.',
  },
  {
    n: '02',
    title: 'Add a bank account',
    body: 'Routing and account numbers are validated with ABA mod-10 then encrypted at rest. The next time you print, they round-trip through the renderer — never your screen.',
  },
  {
    n: '03',
    title: 'Import data and print',
    body: 'Upload a CSV, map columns, and kick off a batch. We render a single multi-page PDF with a sha-256 checksum so you can verify what shipped.',
  },
];

export function HowItWorks(): React.JSX.Element {
  return (
    <Section
      id="how-it-works"
      eyebrow="Workflow"
      heading="From template to printed batch in three steps"
    >
      <ol className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.n}
            className="relative rounded-2xl border border-gray-200 bg-white p-6"
          >
            <span className="font-mono text-sm font-semibold text-brand-600">{step.n}</span>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{step.body}</p>
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-1/2 -right-3 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 md:inline-flex"
              >
                <ArrowRight className="size-3" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Pricing                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    cadence: '/month',
    blurb: 'For solo founders and small teams getting started with check automation.',
    features: [
      '1 organization',
      'Up to 200 checks / mo',
      '1 template',
      'CSV import',
      'Email support',
    ],
    cta: 'Start free',
    href: '/register',
    featured: false,
  },
  {
    name: 'Business',
    price: '$199',
    cadence: '/month',
    blurb: 'For finance teams that print regularly and need audit + role controls.',
    features: [
      'Up to 5 organizations',
      'Unlimited checks',
      'Unlimited templates',
      'Audit log + role-based access',
      'Idempotency keys',
      'Priority support',
    ],
    cta: 'Start free trial',
    href: '/register',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    blurb: 'For organizations with SSO, SLA, or compliance requirements.',
    features: [
      'Unlimited orgs + seats',
      'SSO / SAML',
      '99.9% uptime SLA',
      'Dedicated solutions engineer',
      'Custom data residency',
      'Annual security review',
    ],
    cta: 'Talk to sales',
    href: 'mailto:hello@bizchecks.app?subject=Enterprise%20inquiry',
    featured: false,
  },
];

export function PricingSection(): React.JSX.Element {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      heading="Simple pricing that scales with your batches"
      description="Start free. Upgrade when you need more orgs, audit, or compliance controls. No per-check fees on Business."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'relative flex flex-col rounded-2xl border p-7 transition-shadow',
              plan.featured
                ? 'border-brand-600 bg-gradient-to-b from-brand-50/60 to-white shadow-xl shadow-brand-600/10'
                : 'border-gray-200 bg-white shadow-sm hover:shadow-md',
            )}
          >
            {plan.featured ? (
              <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
                <Sparkles className="size-3" />
                Most popular
              </span>
            ) : null}

            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">{plan.name}</h3>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-bold tracking-tight text-gray-900">{plan.price}</span>
              {plan.cadence ? <span className="pb-1.5 text-sm text-gray-500">{plan.cadence}</span> : null}
            </div>
            <p className="mt-3 text-sm text-gray-600">{plan.blurb}</p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              {plan.href.startsWith('mailto:') ? (
                <a href={plan.href} className="block">
                  <Button variant={plan.featured ? 'primary' : 'outline'} className="w-full">
                    {plan.cta}
                  </Button>
                </a>
              ) : (
                <Link href={plan.href} className="block">
                  <Button variant={plan.featured ? 'primary' : 'outline'} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* FAQ                                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export const FAQ_ITEMS = [
  {
    q: 'How are account and routing numbers stored?',
    a: 'Both are encrypted at the application layer using AES-256-GCM, with a per-row key version recorded so future key rotations are non-breaking. They are never returned in their raw form by the API — only the service layer can decrypt.',
  },
  {
    q: 'What MICR fonts do you support?',
    a: 'BizChecks ships with GnuMICR (E-13B), the same open-source font used by USPS and many production check printers. The renderer registers it through @pdf-lib/fontkit for true font embedding in the output PDF.',
  },
  {
    q: 'Can I use my own pre-printed check stock?',
    a: 'Yes. Upload your own template with the bank fields you want to print and BizChecks will render only the variable areas — payee, amount, date, MICR — leaving your pre-printed elements untouched.',
  },
  {
    q: 'How does multi-tenancy work?',
    a: 'Every authenticated request carries an x-organization-id header, and every Prisma query takes the tenant id as its first argument. Tenant isolation is enforced at the query layer — not in handlers — so cross-org leaks are structurally impossible.',
  },
  {
    q: 'Is the API documented and typed?',
    a: 'Yes. Routes are typed end-to-end via Zod schemas. The schemas drive runtime validation, OpenAPI generation, and TypeScript types — so the contract on the wire matches what your code sees.',
  },
  {
    q: 'Can I retry a batch print without double-printing?',
    a: 'Yes. Batch creation accepts an Idempotency-Key header. Keys are stored per-tenant in Redis with a 24h TTL; sending the same key twice replays the original response.',
  },
];

export function FaqSection(): React.JSX.Element {
  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      heading="Questions, answered"
      description="If your question isn't here, reach out at hello@bizchecks.app and we'll get back to you within one business day."
    >
      <div className="mx-auto max-w-3xl divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
              <h3 className="text-base font-semibold text-gray-900">{item.q}</h3>
              <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-transform group-open:rotate-45">
                <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-gray-600">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Final CTA                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export function CtaSection(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 px-8 py-16 text-center text-white shadow-2xl shadow-brand-900/20 sm:px-16">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]"
          />
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Ship your first batch this afternoon.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-brand-100/90">
            Sign up, design a template, and print a test batch in under 15 minutes. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-brand-700 hover:bg-brand-50"
                iconRight={<ArrowRight className="size-4" />}
              >
                Start free
              </Button>
            </Link>
            <a href="mailto:hello@bizchecks.app?subject=Demo%20request">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Talk to sales
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Section primitive                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

interface SectionProps {
  id: string;
  eyebrow: string;
  heading: string;
  description?: string;
  children: React.ReactNode;
  tone?: 'light' | 'dark';
}

function Section({
  id,
  eyebrow,
  heading,
  description,
  children,
  tone = 'light',
}: SectionProps): React.JSX.Element {
  const isDark = tone === 'dark';
  return (
    <section
      id={id}
      // scroll-mt accounts for the sticky header height when anchor-jumping
      className={cn(
        'relative scroll-mt-20 py-20 sm:py-28',
        isDark ? 'bg-gray-950 text-white' : 'bg-white',
      )}
    >
      {isDark ? (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
      ) : null}
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span
            className={cn(
              'inline-block text-xs font-semibold uppercase tracking-[0.18em]',
              isDark ? 'text-brand-300' : 'text-brand-700',
            )}
          >
            {eyebrow}
          </span>
          <h2
            className={cn(
              'mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl',
              isDark ? 'text-white' : 'text-gray-900',
            )}
          >
            {heading}
          </h2>
          {description ? (
            <p
              className={cn(
                'mt-4 text-pretty text-base',
                isDark ? 'text-gray-300' : 'text-gray-600',
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}
