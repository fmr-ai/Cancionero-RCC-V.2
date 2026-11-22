import React, { useEffect } from 'react';

interface ConfirmDialogProps {
  message: string | null;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!message) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [message, onCancel]);

  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmación"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-sm p-5 border border-amber-200 dark:border-white/10 shadow-xl">
        <p className="text-sm mb-5 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-sm font-medium transition-colors whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
