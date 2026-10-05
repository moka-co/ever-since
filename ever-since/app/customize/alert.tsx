'use client';

interface AlertProps {
  type: 'error' | 'success';
  message: string;
  onDismiss: () => void;
}

export default function Alert({ type, message, onDismiss }: AlertProps) {
  const isError = type === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`p-3 text-xs rounded-xl flex items-center justify-between border ${
        isError
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className={`font-bold ml-2 ${
          isError ? 'text-rose-500 hover:text-rose-800' : 'text-emerald-500 hover:text-emerald-800'
        }`}
        aria-label="Dismiss message"
      >
        ✕
      </button>
    </div>
  );
}
