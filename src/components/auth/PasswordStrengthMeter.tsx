'use client';

import React from 'react';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';

interface PasswordStrengthMeterProps {
  password?: string;
}

export function PasswordStrengthMeter({ password = '' }: PasswordStrengthMeterProps) {
  const strength = usePasswordStrength(password);

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
        <div
          className={`h-full transition-all duration-300 ease-out ${strength.color} ${strength.width}`}
        />
      </div>
      <p className="text-right text-xs font-medium text-slate-400">
        {password.length === 0 ? 'Enter a password' : strength.label.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
      </p>
    </div>
  );
}
