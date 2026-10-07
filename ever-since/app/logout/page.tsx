'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'logging-out' | 'logged-out' | 'error'>('logging-out');

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    fetch('/api/auth/logout', { method: 'POST' })
      .then((res) => {
        if (res.ok) {
          setStatus('logged-out');
          timeoutId = setTimeout(() => {
            router.push('/login');
          }, 2500);
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        setStatus('error');
      });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router]);

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 md:p-12 select-none">
      <article className="w-80 sm:w-96 md:w-[420px] max-w-full rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] p-8 sm:p-10 flex flex-col items-center justify-center text-center">
        {/* Soft progress indicator matching main flow */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          <span className="w-2 h-2 rounded-full bg-[#F1D6DE]" />
          <span className="w-6 h-2 rounded-full bg-[#D4537E] animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-[#F1D6DE]" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Ever Since...</h1>

        {status === 'logging-out' && (
          <p className="text-sm font-normal text-muted">Logging out...</p>
        )}
        {status === 'logged-out' && (
          <p className="text-sm font-medium text-foreground">Redirecting to login</p>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-rose-500">Failed to log out.</p>
            <button
              onClick={() => router.push('/login')}
              className="rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white px-5 py-2 text-xs font-semibold transition-all shadow-[0_4px_16px_rgba(244,114,182,0.4)]"
            >
              Go to Login
            </button>
          </div>
        )}
      </article>
    </main>
  );
}
