import Link from 'next/link';

const FOOTER_NAV: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#designer', label: 'Designer' },
      { href: '#security', label: 'Security' },
      { href: '#pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '#how-it-works', label: 'How it works' },
      { href: '#faq', label: 'FAQ' },
      { href: 'https://github.com/jwillz7667/Biz-Checks', label: 'GitHub', external: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: 'mailto:hello@bizchecks.app', label: 'Contact' },
      { href: '/login', label: 'Sign in' },
      { href: '/register', label: 'Start free' },
    ],
  },
];

export function SiteFooter(): React.JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex size-7 items-center justify-center rounded-md bg-brand-600 text-[13px] font-bold text-white shadow-sm"
              >
                B
              </span>
              <span className="text-base font-semibold tracking-tight text-gray-900">BizChecks</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-gray-600">
              The modern business-check platform. Design, batch-print, and audit checks with bank-grade
              security.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3">
            {FOOTER_NAV.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-sm text-gray-700 hover:text-gray-900"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-gray-700 hover:text-gray-900"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-gray-200 pt-6 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>© {year} BizChecks. All rights reserved.</p>
          <p className="font-mono text-[11px] text-gray-400">
            AES-256-GCM · ABA mod-10 · GnuMICR E-13B
          </p>
        </div>
      </div>
    </footer>
  );
}
