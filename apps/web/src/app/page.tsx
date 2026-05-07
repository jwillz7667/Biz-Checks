import type { Metadata } from 'next';

import { JsonLd } from '@/components/marketing/json-ld';
import {
  CtaSection,
  DesignerShowcase,
  FAQ_ITEMS,
  FaqSection,
  FeaturesGrid,
  Hero,
  HowItWorks,
  PricingSection,
  SecuritySection,
} from '@/components/marketing/sections';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bizchecks.app';
const PAGE_TITLE = 'BizChecks — Design and print business checks at production scale';
const PAGE_DESCRIPTION =
  'BizChecks is the modern check-printing platform for finance teams. Build branded templates in a visual designer, batch-print thousands of checks from a CSV, and stay audit-ready with bank-grade encryption.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  // Override the layout-level noindex — this page is the marketing surface
  // and should be discoverable.
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  keywords: [
    'business check printing',
    'check designer',
    'MICR printing',
    'batch check printing',
    'payroll checks',
    'check template designer',
    'AP automation',
    'bank check software',
  ],
  openGraph: {
    type: 'website',
    siteName: 'BizChecks',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function LandingPage(): React.JSX.Element {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={faqSchema()} />

      <SiteHeader />
      <main id="main">
        <Hero />
        <FeaturesGrid />
        <DesignerShowcase />
        <SecuritySection />
        <HowItWorks />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}

function organizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BizChecks',
    url: SITE_URL,
    description: PAGE_DESCRIPTION,
    sameAs: ['https://github.com/jwillz7667/Biz-Checks'],
  };
}

function softwareApplicationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BizChecks',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: PAGE_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Visual check designer',
      'Batch CSV-driven check printing',
      'AES-256-GCM field-level encryption',
      'Multi-tenant architecture',
      'Audit log for every mutation',
      'Idempotent batch operations',
      'ABA mod-10 routing-number validation',
      'GnuMICR (E-13B) font embedding',
    ],
  };
}

function faqSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}
