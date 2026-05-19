import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="animate-in fade-in zoom-in-95 duration-700 max-w-2xl">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-2xl shadow-indigo-500/20">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Gatekeeper</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-400">
          Build the door that decides who gets in. Secure, dynamic, and seamless authentication for the modern web.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="w-full sm:w-auto rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Sign Up
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            Log In
          </Link>
        </div>
      </div>
    </main>
  );
}
