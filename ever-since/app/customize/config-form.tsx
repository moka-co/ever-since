'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Alert from './alert';

interface ConfigFormProps {
  initialDate: string;
}

export default function ConfigForm({ initialDate }: ConfigFormProps) {
  const router = useRouter();
  const [date, setDate] = useState<string>(initialDate);
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

      {errorMessage && (
        <Alert type="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <Alert type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
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
