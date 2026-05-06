'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-provider';

const Schema = z.object({
  fullName: z.string().min(1, 'Required').max(200),
  organizationName: z.string().min(1, 'Required').max(200),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(12, 'Min 12 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[0-9]/, 'Needs a digit'),
});
type FormData = z.infer<typeof Schema>;

export default function RegisterPage(): React.JSX.Element {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(Schema) });

  const onSubmit = async (data: FormData): Promise<void> => {
    setServerError(null);
    try {
      await registerUser(data);
      router.replace('/dashboard');
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'Could not create account. Try again.',
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">BizChecks</h1>
          <p className="mt-2 text-sm text-gray-600">Create your workspace</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              id="fullName"
              autoComplete="name"
              label="Your name"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input
              id="organizationName"
              label="Organization name"
              description="Your company or workspace name"
              error={errors.organizationName?.message}
              {...register('organizationName')}
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              label="Work email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              label="Password"
              description="At least 12 characters with letters and numbers"
              error={errors.password?.message}
              {...register('password')}
            />
            {serverError ? (
              <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </div>
            ) : null}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Create account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
