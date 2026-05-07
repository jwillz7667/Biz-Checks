import type { Metadata, Viewport } from 'next';

import { AuthProvider } from '@/lib/auth/auth-provider';
import { ToastProvider } from '@/lib/ui/toast';

import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bizchecks.app';

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
