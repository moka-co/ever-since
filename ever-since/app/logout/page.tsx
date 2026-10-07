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
      <div className="relative w-80 sm:w-96 md:w-[420px] max-w-full">
        {/* Subtle faux stack cue for stylistic consistency with main flow */}
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-3.5 translate-y-2 rounded-[36px] md:rounded-[40px] border border-[#ECDCE3] bg-[#FCF8FA] shadow-[0_10px_35px_rgba(255,150,170,0.18)] -z-10"
        />

        <article className="w-full rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] p-8 sm:p-10 flex flex-col items-center justify-center text-center">
          {status === 'logging-out' && (
            <p className="text-base font-normal text-muted">Logging out...</p>
          )}
          {status === 'logged-out' && (
            <p className="text-base font-medium text-foreground">Redirecting to login</p>
          )}
          {status === 'error' && (
            <p className="text-sm font-medium text-rose-500">Failed to log out.</p>
          )}
        </article>
      </div>
    </main>
  );
}
