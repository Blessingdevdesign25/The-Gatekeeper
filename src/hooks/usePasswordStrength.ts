'use client';

import { useMemo } from 'react';
import { PasswordStrength } from '@/types';

interface StrengthResult {
  score: 0 | 1 | 2 | 3;
  label: PasswordStrength;
  color: string;
  width: string;
}

// Scores a password on four character class dimensions.
// This is a UX feature — the server enforces the minimum requirement (8 chars).
function scorePassword(password: string): StrengthResult {
  if (password.length === 0) {
    return { score: 0, label: 'weak', color: 'bg-red-400', width: 'w-0' };
  }

  let score = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (classes >= 2) score++;
  if (classes >= 4) score++;

  // Clamp to max 3
  const clamped = Math.min(score, 3) as 0 | 1 | 2 | 3;

  const map: Record<0 | 1 | 2 | 3, Omit<StrengthResult, 'score'>> = {
    0: { label: 'weak',       color: 'bg-red-400',    width: 'w-1/4' },
    1: { label: 'fair',       color: 'bg-orange-400', width: 'w-2/4' },
    2: { label: 'strong',     color: 'bg-yellow-400', width: 'w-3/4' },
    3: { label: 'very-strong', color: 'bg-green-500', width: 'w-full' },
  };

  return { score: clamped, ...map[clamped] };
}

export function usePasswordStrength(password: string): StrengthResult {
  return useMemo(() => scorePassword(password), [password]);
}
