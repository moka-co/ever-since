'use client';

import { useState, type FormEvent } from 'react';
import Alert from './alert';
import SaveSubmitButton from './save-submit-button';
import { useConfigSave } from './use-config-save';

interface ConfigFormProps {
  initialDate: string;
}

export default function ConfigForm({ initialDate }: ConfigFormProps) {
  const [date, setDate] = useState<string>(initialDate);
  const { isSaving, isSaved, errorMessage, clearError, submitConfig } =
    useConfigSave('Failed to update anniversary date.');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitConfig({ anniversaryDate: date });
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
        <Alert type="error" message={errorMessage} onDismiss={clearError} />
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
        <SaveSubmitButton
          isSaving={isSaving}
          isSaved={isSaved}
          idleLabel="Save Date"
          size="md"
        />
      </form>
    </div>
  );
}
