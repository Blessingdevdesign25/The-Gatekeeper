import { requireAuth } from '@/lib/auth';
import { LogoutButton } from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-12 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg mb-8">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">{session.name}</span>
          </h1>
          <p className="text-lg text-slate-400 mb-10">
            You have successfully bypassed The Gatekeeper.
          </p>
          
          <div className="flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
