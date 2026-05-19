'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { signupSchema } from '@/lib/validation';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear error when user types
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
    setError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);
    setFieldErrors({});

    // Client-side validation
    const validationResult = signupSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
      });
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        if (data.fields) {
          setFieldErrors(data.fields);
        } else {
          setError(data.error || 'Something went wrong');
        }
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
            <p className="mt-2 text-sm text-slate-400">Join us and build the future.</p>
          </div>

          <FormError message={error} />

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <Input
              label="Full Name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              error={fieldErrors.name}
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={fieldErrors.email}
            />

            <div className="space-y-1">
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={fieldErrors.password}
              />
              <PasswordStrengthMeter password={formData.password} />
            </div>

            <Button type="submit" isLoading={isLoading} className="mt-2">
              Sign Up
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}
