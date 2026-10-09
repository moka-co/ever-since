'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Alert from './alert';

interface ConfigFormProps {
  initialDate: string;
}

export default function ConfigForm({ initialDate }: ConfigFormProps) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialDate);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);
    setIsSaved(false);

    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anniversaryDate: date }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to update anniversary date.');
        return;
      }

      setIsSaved(true);
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h2 id="config-heading" className="text-lg font-semibold text-foreground">
          Anniversary Date
        </h2>
        <p className="text-xs text-muted">The kickoff date for your story</p>
      </div>

      {errorMessage && (
        <Alert type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
        <input
          type="date"
          name="anniversaryDate"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isSaving}
          className="rounded-xl border border-[#ECDCE3] bg-[#FAF7F8] px-3.5 py-2 text-sm text-foreground focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs disabled:opacity-50 transition-colors w-full sm:w-auto"
        />
        <button
          type="submit"
          disabled={isSaving}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition-all shadow-md shrink-0 hover:scale-102 active:scale-98 disabled:opacity-50 disabled:shadow-none ${
            isSaved
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
              : 'bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white shadow-[0_2px_10px_rgba(244,114,182,0.35)] hover:shadow-[0_4px_14px_rgba(244,114,182,0.5)] disabled:from-gray-300 disabled:to-gray-300'
          }`}
        >
          {isSaving ? 'Saving...' : isSaved ? '✓ Saved!' : 'Save Date'}
        </button>
      </form>
    </div>
  );
}
