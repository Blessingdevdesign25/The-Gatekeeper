import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20 backdrop-blur-sm animate-in fade-in slide-in-from-top-1">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
