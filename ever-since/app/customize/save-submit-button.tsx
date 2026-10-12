'use client';

export interface SaveSubmitButtonProps {
  isSaving: boolean;
  isSaved: boolean;
  idleLabel: string;
  savingLabel?: string;
  savedLabel?: string;
  size?: 'sm' | 'md';
}

export function getSaveSubmitButtonState({
  isSaving,
  isSaved,
  idleLabel,
  savingLabel = 'Saving...',
  savedLabel = '✓ Saved!',
  size = 'md',
}: SaveSubmitButtonProps) {
  const sizeClasses = size === 'sm' ? 'px-4 py-2 text-xs' : 'px-5 py-2 text-sm';
  const colorClasses = isSaved
    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
    : 'bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white shadow-[0_2px_10px_rgba(244,114,182,0.35)] hover:shadow-[0_4px_14px_rgba(244,114,182,0.5)] disabled:from-gray-300 disabled:to-gray-300';

  return {
    disabled: isSaving,
    label: isSaving ? savingLabel : isSaved ? savedLabel : idleLabel,
    className: `rounded-full ${sizeClasses} font-semibold transition-all shadow-md shrink-0 hover:scale-102 active:scale-98 disabled:opacity-50 disabled:shadow-none ${colorClasses}`,
  };
}

export default function SaveSubmitButton(props: SaveSubmitButtonProps) {
  const { disabled, label, className } = getSaveSubmitButtonState(props);

  return (
    <button type="submit" disabled={disabled} className={className}>
      {label}
    </button>
  );
}
