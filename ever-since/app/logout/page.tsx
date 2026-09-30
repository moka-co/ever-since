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
          }, 5000);
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
    <main className="min-h-screen flex items-center justify-center text-center">
      {status === 'logging-out' && <p>Logging out...</p>}
      {status === 'logged-out' && <p>Logged out. Redirecting to login in 5 seconds...</p>}
      {status === 'error' && <p>Failed to log out.</p>}
    </main>
  );
}
