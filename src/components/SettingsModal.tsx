import React, { useEffect, useState } from 'react';
import { Printer, RotateCcw, Upload, X } from 'lucide-react';
import type { ChordNotation } from '../types/songbook';

interface SettingsModalProps {
  open: boolean;
  logoUrl: string;
  chordNotation: ChordNotation;
  onClose: () => void;
  onUploadLogo: (file: File) => void;
  onApplyLogoUrl: (url: string) => void;
  onResetLogo: () => void;
  onChangeNotation: (notation: ChordNotation) => void;
  onOpenPrint: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  logoUrl,
  chordNotation,
  onClose,
  onUploadLogo,
  onApplyLogoUrl,
  onResetLogo,
  onChangeNotation,
  onOpenPrint,
}) => {
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Configuración"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-md p-5 max-h-[88vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-lg font-semibold">Configuración</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-amber-100 dark:hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logo */}
        <div>
          <p className="text-xs font-semibold mb-2">Logo de la comunidad</p>
          <div className="flex items-center gap-4 mb-3">
            <img
              src={logoUrl}
              alt="Logo actual"
              className="w-16 h-16 rounded-full object-cover border border-amber-300 dark:border-white/20 bg-white shrink-0"
            />
            <div className="flex flex-wrap gap-1.5">
              <label className="inline-flex items-center gap-1 bg-coral-500 hover:bg-coral-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                Subir imagen
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadLogo(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onResetLogo}
                className="inline-flex items-center gap-1 bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer RCC Arica
              </button>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = urlInput.trim();
              if (!clean) return;
              onApplyLogoUrl(clean);
              setUrlInput('');
            }}
            className="flex gap-2"
          >
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="O pegar URL de imagen..."
              aria-label="URL de imagen del logo"
              className="flex-1 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-xs"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold"
            >
              Aplicar
            </button>
          </form>
        </div>

        {/* Chord Notation */}
        <div className="pt-3 border-t border-amber-200/50 dark:border-white/10">
          <p className="text-xs font-semibold mb-2">Notación de acordes al visualizar</p>
          <div className="space-y-1.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="chordNotation"
                checked={chordNotation === 'american'}
                onChange={() => onChangeNotation('american')}
                className="accent-coral-500"
              />
              <span>Americana (C, D, Em, F, G, Am, B7)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="chordNotation"
                checked={chordNotation === 'latin'}
                onChange={() => onChangeNotation('latin')}
                className="accent-coral-500"
              />
              <span>Latina (Do, Re, Mim, Fa, Sol, Lam, Si7)</span>
            </label>
          </div>
        </div>

        {/* Print Shortcut */}
        <div className="pt-3 border-t border-amber-200/50 dark:border-white/10 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">Cuadernillo impreso o PDF</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPrint();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Abrir impresión
          </button>
        </div>

        {/* Guide */}
        <div className="pt-3 border-t border-amber-200/50 dark:border-white/10">
          <details className="text-xs text-ink/75 dark:text-cream-100/75">
            <summary className="font-semibold cursor-pointer select-none">
              Guía rápida de funciones
            </summary>
            <ul className="mt-2 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong>Transposición y cejillo:</strong> Usa -1 / +1 para cambiar de tono o abre &quot;Cejillo&quot; para ver trastes cómodos en guitarra.
              </li>
              <li>
                <strong>Diagramas de guitarra y teclado:</strong> Toca cualquier acorde encima de la letra para ver su posición en guitarra o sus notas en teclado.
              </li>
              <li>
                <strong>Modo escenario y Solo letra:</strong> Proyecta sin distracciones u oculta los acordes para cantores y asamblea.
              </li>
              <li>
                <strong>En vivo (P2P):</strong> Comparte un código de 6 dígitos para sincronizar la canción y su tono con otros músicos, incluso si aún no la tienen guardada.
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
};
