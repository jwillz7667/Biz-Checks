'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth/auth-provider';

export default function HomePage(): null {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [isLoading, user, router]);
  return null;
}
