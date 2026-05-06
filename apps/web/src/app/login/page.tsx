'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-provider';

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof Schema>;

export default function LoginPage(): React.JSX.Element {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const next = searchParams.get('next') ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: FormData): Promise<void> => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      router.replace(next);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'Could not sign in. Please try again.',
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">BizChecks</h1>
          <p className="mt-2 text-sm text-gray-600">Enterprise check design and printing</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Sign in</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              label="Email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              label="Password"
              error={errors.password?.message}
              {...register('password')}
            />
            {serverError ? (
              <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </div>
            ) : null}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
