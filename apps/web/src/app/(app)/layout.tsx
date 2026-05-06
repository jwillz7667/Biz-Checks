'use client';

import {
  Banknote,
  ChevronDown,
  Database,
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Printer,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth/auth-provider';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: readonly NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/templates', label: 'Templates', icon: Layers },
  { href: '/bank-accounts', label: 'Bank accounts', icon: Banknote },
  { href: '/data-sources', label: 'Data sources', icon: Database },
  { href: '/checks', label: 'Checks', icon: FileText },
  { href: '/batches', label: 'Batches', icon: Printer },
];

export default function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, user, organizationId, role, logout, setActiveOrganization } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      const next = encodeURIComponent(pathname ?? '/dashboard');
      router.replace(`/login?next=${next}`);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  const activeOrg = user.organizations.find((o) => o.id === organizationId) ?? user.organizations[0];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-lg font-semibold tracking-tight text-gray-900">BizChecks</span>
        </div>

        {user.organizations.length > 0 ? (
          <div className="border-b border-gray-200 p-3">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Organization
            </label>
            <div className="relative">
              <select
                aria-label="Active organization"
                value={organizationId ?? ''}
                onChange={(e) => setActiveOrganization(e.target.value)}
                className="block w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pr-8 pl-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {user.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-2 right-2 size-4 text-gray-400" />
            </div>
            {role ? (
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Role · {role}
              </div>
            ) : null}
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto p-2 thin-scroll">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 truncate text-sm font-medium text-gray-900">{user.fullName}</div>
          <div className="mb-3 truncate text-xs text-gray-500">{user.email}</div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <div className="border-b border-gray-200 bg-white px-6 py-3 text-sm text-gray-600">
          {activeOrg?.name ?? 'No organization selected'}
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
