import { Caveat, Great_Vibes, Sacramento } from 'next/font/google';

import type { Metadata, Viewport } from 'next';

import { AuthProvider } from '@/lib/auth/auth-provider';
import { ToastProvider } from '@/lib/ui/toast';

import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bizchecks.app';

// Load the same three OFL signature fonts the PDF renderer embeds, so the
// designer canvas preview matches what comes out of print.
const caveat = Caveat({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-caveat' });
const sacramento = Sacramento({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-sacramento' });
const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', display: 'swap', variable: '--font-great-vibes' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'BizChecks', template: '%s · BizChecks' },
  description: 'Enterprise business check design and printing',
  applicationName: 'BizChecks',
  // Default to noindex for the whole app — every authenticated route inherits
  // this. The marketing landing page (`/`) explicitly opts back in.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html
      lang="en"
      className={`${caveat.variable} ${sacramento.variable} ${greatVibes.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
