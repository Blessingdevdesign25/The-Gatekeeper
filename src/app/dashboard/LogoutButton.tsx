'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Failed to log out:', err);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      isLoading={isLoading}
      className="w-auto bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-none hover:shadow-none bg-none from-transparent to-transparent hover:from-slate-700 hover:to-slate-700"
    >
      Log Out
    </Button>
  );
}
