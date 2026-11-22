import React, { useEffect, useMemo, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import type { ChordNotation, MainCategory, Song } from '../types/songbook';
import { songHasAnyCategory } from '../utils/categories';
import { extractUniqueChords, suggestSongKey } from '../utils/chords';

interface OrganizerModalProps {
  open: boolean;
  songs: Song[];
  mainCategories: MainCategory[];
  chordNotation: ChordNotation;
  onClose: () => void;
  onAutoDetectAllKeys: () => number;
  onUpdateSongMeta: (
    songId: string,
    patch: { key: string; categories: string[]; mainCategories: string[] }
  ) => void;
}

export const OrganizerModal: React.FC<OrganizerModalProps> = ({
  open,
  songs,
  mainCategories,
  chordNotation,
  onClose,
  onAutoDetectAllKeys,
  onUpdateSongMeta,
}) => {
  const [filterMode, setFilterMode] = useState<'pending' | 'all'>('pending');
  const [index, setIndex] = useState(0);
  const [keyInput, setKeyInput] = useState('');
  const [catsInput, setCatsInput] = useState<string[]>([]);
  const [mainsInput, setMainsInput] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const queue = useMemo(() => {
    const sorted = [...songs].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es'));
    if (filterMode === 'pending') {
      return sorted.filter((s) => !songHasAnyCategory(s) || !s.key);
    }
    return sorted;
  }, [songs, filterMode]);

  const safeIndex = Math.min(index, Math.max(0, queue.length - 1));
  const currentSong = queue[safeIndex] || null;

  useEffect(() => {
    if (!currentSong) return;
    setKeyInput(currentSong.key || '');
    setCatsInput([...currentSong.categories]);
    setMainsInput([...currentSong.mainCategories]);
  }, [currentSong]);

  if (!open) return null;

  const pendingTotal = songs.filter((s) => !songHasAnyCategory(s) || !s.key).length;
  const suggestion = currentSong ? suggestSongKey(currentSong) : null;
  const previewChords = currentSong
    ? extractUniqueChords(currentSong.content, 0, chordNotation).slice(0, 12)
    : [];

  const handleSaveAndNext = () => {
    if (!currentSong) return;
    onUpdateSongMeta(currentSong.id, {
      key: keyInput.trim(),
      categories: catsInput,
      mainCategories: mainsInput,
    });
    if (filterMode === 'all' && safeIndex < queue.length - 1) {
      setIndex(safeIndex + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Ordenar canciones"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-3xl p-5 max-h-[90vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Ordenar canciones (tonos y categorías)</h3>
            <p className="text-xs text-ink/60 dark:text-cream-100/60 tabular-nums">
              {pendingTotal} pendientes de {songs.length} en total
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-amber-100 dark:hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-amber-200/50 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFilterMode('pending');
                setIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filterMode === 'pending'
                  ? 'bg-coral-500 text-white'
                  : 'bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20'
              }`}
            >
              Pendientes ({pendingTotal})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-coral-500 text-white'
                  : 'bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20'
              }`}
            >
              Todas ({songs.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onAutoDetectAllKeys}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-coral-500" />
            Detectar tonos automáticamente
          </button>
        </div>

        {!currentSong ? (
          <div className="text-center py-10">
            <p className="font-display text-lg font-semibold mb-1">Todo ordenado</p>
            <p className="text-xs text-ink/65 dark:text-cream-100/65 mb-4">
              Todas tus canciones tienen tono y al menos una categoría asignada.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setIndex(0);
              }}
              className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-white/10 text-xs font-semibold"
            >
              Revisar todas
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs text-ink/65 dark:text-cream-100/65 tabular-nums">
              <span>
                Canción {safeIndex + 1} de {queue.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeIndex === 0}
                  onClick={() => setIndex(Math.max(0, safeIndex - 1))}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-white/10 disabled:opacity-35 font-medium"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={safeIndex >= queue.length - 1}
                  onClick={() => setIndex(Math.min(queue.length - 1, safeIndex + 1))}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-white/10 disabled:opacity-35 font-medium"
                >
                  Saltar →
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/70 dark:bg-white/5 border border-amber-200/75 dark:border-white/10 space-y-3">
              <h4 className="font-display text-lg font-semibold">{currentSong.title}</h4>
              {previewChords.length > 0 && (
                <p className="text-xs font-mono text-coral-600 dark:text-coral-300">
                  Acordes detectados: {previewChords.map((c) => c.display).join(' · ')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium">
                  Tonalidad:
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Ej: Do, Sol, La menor..."
                    className="ml-2 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10 text-xs"
                  />
                </label>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => setKeyInput(suggestion.key)}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-medium"
                  >
                    Sugerido: {suggestion.key}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mainCategories.map((mc) => (
                  <div
                    key={mc.id}
                    className="p-2 rounded-xl bg-cream-50/70 dark:bg-white/5 border border-amber-200/60 dark:border-white/10"
                  >
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={mainsInput.includes(mc.id)}
                        onChange={() =>
                          setMainsInput((prev) =>
                            prev.includes(mc.id) ? prev.filter((x) => x !== mc.id) : [...prev, mc.id]
                          )
                        }
                        className="rounded accent-coral-500"
                      />
                      <span>
                        {mc.icon} {mc.name}
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {mc.subcategories.map((sub) => {
                        const active = catsInput.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() =>
                              setCatsInput((prev) =>
                                prev.includes(sub) ? prev.filter((x) => x !== sub) : [...prev, sub]
                              )
                            }
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                              active
                                ? 'bg-coral-500 text-white border-coral-500'
                                : 'bg-white dark:bg-white/5 border-amber-200/70 dark:border-white/10'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar y continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
