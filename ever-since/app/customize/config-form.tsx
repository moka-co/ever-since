'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface ConfigFormProps {
  initialDate: string;
  onDateChanged?: (newDate: string) => void;
}

export default function ConfigForm({ initialDate, onDateChanged }: ConfigFormProps) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialDate || '2025-09-30');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

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

      setSuccessMessage('Anniversary date saved successfully.');
      onDateChanged?.(data.config?.anniversaryDate ?? date);
      router.refresh();
    } catch {
      setErrorMessage('A network error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="config-heading"
      className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]"
    >
      <div className="flex items-center justify-between">
        <h2 id="config-heading" className="text-lg font-semibold text-foreground">
          Anniversary Date
        </h2>
        <span className="text-xs text-muted">The kickoff date for your story</span>
      </div>

      {/* Inline Feedback Alerts */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 font-bold ml-2"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="p-3 text-xs rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 font-bold ml-2"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="date"
          name="anniversaryDate"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isSaving}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-[#1E1B24] hover:bg-[#2D2837] text-white px-5 py-2 text-sm font-medium transition-colors shadow-xs disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Date'}
        </button>
      </form>
    </section>
  );
}
