import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Play, Plus, Trash2, X } from 'lucide-react';
import type { ChordNotation, MainCategory, Repertoire, Song } from '../types/songbook';
import { matchesFilterSets } from '../utils/categories';
import {
  detectOriginalRoot,
  formatRootForDisplay,
  NOTES_SHARP,
  shiftNote,
  shortestOffset,
} from '../utils/chords';

interface RepertoireManagerModalProps {
  open: boolean;
  repertoires: Repertoire[];
  onClose: () => void;
  onCreateRepertoire: (name: string) => void;
  onRenameRepertoire: (repId: string, name: string) => void;
  onMoveRepertoire: (repId: string, delta: number) => void;
  onTogglePinned: (repId: string, pinned: boolean) => void;
  onEditRepertoire: (repId: string) => void;
  onPlayRepertoire: (repId: string) => void;
  onDeleteRepertoire: (repId: string) => void;
}

export const RepertoireManagerModal: React.FC<RepertoireManagerModalProps> = ({
  open,
  repertoires,
  onClose,
  onCreateRepertoire,
  onRenameRepertoire,
  onMoveRepertoire,
  onTogglePinned,
  onEditRepertoire,
  onPlayRepertoire,
  onDeleteRepertoire,
}) => {
  const [newName, setNewName] = useState('');

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
      aria-label="Repertorios"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-xl p-5 max-h-[88vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg font-semibold">Repertorios</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-amber-100 dark:hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean = newName.trim();
            if (!clean) return;
            onCreateRepertoire(clean);
            setNewName('');
          }}
          className="flex gap-2 mb-4"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: Misa del domingo, Grupo jueves..."
            aria-label="Nombre del nuevo repertorio"
            className="flex-1 px-3 py-2 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 bg-coral-500 hover:bg-coral-600 text-white px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear
          </button>
        </form>

        <div className="space-y-2">
          {repertoires.length === 0 ? (
            <p className="text-xs text-ink/55 dark:text-cream-100/50 text-center py-6">
              Todavía no tienes repertorios. Crea uno para armar tu lista de cantos con orden y tonos propios.
            </p>
          ) : (
            repertoires.map((rep, idx) => (
              <div
                key={rep.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white/65 dark:bg-white/5 border border-amber-200/80 dark:border-white/10"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <input
                    defaultValue={rep.name}
                    key={rep.id + rep.name}
                    aria-label={`Renombrar repertorio ${rep.name}`}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== rep.name) onRenameRepertoire(rep.id, val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="min-w-0 flex-1 px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-amber-200/70 dark:border-white/10 text-sm font-semibold"
                  />
                  <span className="text-xs text-ink/60 dark:text-cream-100/55 tabular-nums whitespace-nowrap">
                    {rep.songs.length} {rep.songs.length === 1 ? 'canto' : 'cantos'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveRepertoire(rep.id, -1)}
                    aria-label={`Subir ${rep.name}`}
                    className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-white/10 disabled:opacity-30 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={idx === repertoires.length - 1}
                    onClick={() => onMoveRepertoire(rep.id, 1)}
                    aria-label={`Bajar ${rep.name}`}
                    className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-white/10 disabled:opacity-30 text-xs"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePinned(rep.id, !rep.pinnedInBar)}
                    title={rep.pinnedInBar ? 'Visible en barra rápida' : 'Oculto en barra rápida'}
                    aria-label={rep.pinnedInBar ? `Ocultar ${rep.name} de barra` : `Mostrar ${rep.name} en barra`}
                    className={`p-1.5 rounded-lg ${
                      rep.pinnedInBar
                        ? 'bg-amber-100 dark:bg-white/15 text-coral-600 dark:text-coral-300'
                        : 'bg-white/60 dark:bg-white/5 text-ink/45'
                    }`}
                  >
                    {rep.pinnedInBar ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditRepertoire(rep.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-medium whitespace-nowrap"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={rep.songs.length === 0}
                    onClick={() => onPlayRepertoire(rep.id)}
                    aria-label={`Hojear ${rep.name}`}
                    className="p-1.5 rounded-lg bg-coral-500 hover:bg-coral-600 text-white disabled:opacity-35"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRepertoire(rep.id)}
                    aria-label={`Eliminar ${rep.name}`}
                    className="p-1.5 rounded-lg text-coral-500 hover:bg-coral-100 dark:hover:bg-coral-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface RepertoireEditorModalProps {
  open: boolean;
  repertoire: Repertoire | null;
  songs: Song[];
  mainCategories: MainCategory[];
  chordNotation: ChordNotation;
  onClose: () => void;
  onUpdateRepertoire: (rep: Repertoire) => void;
  onPlayRepertoire: (repId: string) => void;
}

export const RepertoireEditorModal: React.FC<RepertoireEditorModalProps> = ({
  open,
  repertoire,
  songs,
  mainCategories,
  chordNotation,
  onClose,
  onUpdateRepertoire,
  onPlayRepertoire,
}) => {
  const [search, setSearch] = useState('');
  const [filterMains, setFilterMains] = useState<Set<string>>(new Set());
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set());
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setFilterMains(new Set());
    setFilterCats(new Set());
    setSelectedCandidates(new Set());
  }, [open, repertoire?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...songs]
      .filter((s) => {
        if (!matchesFilterSets(s, mainCategories, filterMains, filterCats)) return false;
        if (q && !(s.title || '').toLowerCase().includes(q) && !(s.key || '').toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es'));
  }, [songs, mainCategories, filterMains, filterCats, search]);

  if (!open || !repertoire) return null;

  const repSongIds = new Set(repertoire.songs.map((e) => e.id));

  const applyUniformKey = (root: string) => {
    const nextSongs = repertoire.songs.map((entry) => {
      const s = songMap.get(entry.id);
      const orig = detectOriginalRoot(s);
      return {
        id: entry.id,
        transpose: orig ? shortestOffset(orig, root) : 0,
      };
    });
    onUpdateRepertoire({ ...repertoire, mode: 'uniform', uniformKey: root, songs: nextSongs });
  };

  const addSelectedSongs = () => {
    const additions = Array.from(selectedCandidates)
      .filter((id) => !repSongIds.has(id))
      .map((id) => {
        const s = songMap.get(id);
        let tr = 0;
        if (repertoire.mode === 'uniform') {
          const orig = detectOriginalRoot(s);
          if (orig) tr = shortestOffset(orig, repertoire.uniformKey);
        }
        return { id, transpose: tr };
      });
    if (additions.length === 0) return;
    onUpdateRepertoire({ ...repertoire, songs: [...repertoire.songs, ...additions] });
    setSelectedCandidates(new Set());
  };

  const moveEntry = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= repertoire.songs.length || fromIdx === toIdx) return;
    const next = [...repertoire.songs];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    onUpdateRepertoire({ ...repertoire, songs: next });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar repertorio ${repertoire.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-4xl p-5 max-h-[92vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display text-lg font-semibold">{repertoire.name}</h3>
            <p className="text-xs text-ink/60 dark:text-cream-100/60 tabular-nums">
              {repertoire.songs.length} {repertoire.songs.length === 1 ? 'canción' : 'canciones'} en el repertorio
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

        {/* Key mode */}
        <div className="p-3 rounded-xl bg-amber-100/45 dark:bg-white/5 border border-amber-200/70 dark:border-white/10 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold">Tonalidad del repertorio:</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="repKeyMode"
              checked={repertoire.mode === 'original'}
              onChange={() => onUpdateRepertoire({ ...repertoire, mode: 'original' })}
              className="accent-coral-500"
            />
            <span>Individual / original</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="repKeyMode"
              checked={repertoire.mode === 'uniform'}
              onChange={() => onUpdateRepertoire({ ...repertoire, mode: 'uniform' })}
              className="accent-coral-500"
            />
            <span>Unificar todas en un tono</span>
          </label>

          {repertoire.mode === 'uniform' && (
            <div className="flex items-center gap-2">
              <select
                aria-label="Tono unificado del repertorio"
                value={repertoire.uniformKey}
                onChange={(e) => onUpdateRepertoire({ ...repertoire, uniformKey: e.target.value })}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-nightbg-100 border border-amber-200 dark:border-white/10 font-semibold"
              >
                {NOTES_SHARP.map((n) => (
                  <option key={n} value={n}>
                    {formatRootForDisplay(n, chordNotation)} ({n})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => applyUniformKey(repertoire.uniformKey)}
                className="px-3 py-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-semibold whitespace-nowrap"
              >
                Aplicar a todas
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Candidates */}
          <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-amber-200/75 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold">Agregar canciones</h4>
              <button
                type="button"
                disabled={selectedCandidates.size === 0}
                onClick={addSelectedSongs}
                className="px-2.5 py-1 rounded-lg bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
              >
                + Agregar ({selectedCandidates.size})
              </button>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar canción..."
              aria-label="Buscar canciones para agregar"
              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10 text-xs"
            />

            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {mainCategories.map((mc) => {
                const active = filterMains.has(mc.id);
                return (
                  <button
                    key={mc.id}
                    type="button"
                    onClick={() =>
                      setFilterMains((prev) => {
                        const n = new Set(prev);
                        if (n.has(mc.id)) n.delete(mc.id);
                        else n.add(mc.id);
                        return n;
                      })
                    }
                    className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                      active
                        ? 'bg-coral-500 text-white border-coral-500'
                        : 'bg-cream-50 dark:bg-white/5 border-amber-200/70 dark:border-white/10'
                    }`}
                  >
                    {mc.name}
                  </button>
                );
              })}
              {mainCategories.flatMap((mc) =>
                mc.subcategories.map((sub) => {
                  const active = filterCats.has(sub);
                  return (
                    <button
                      key={`${mc.id}-${sub}`}
                      type="button"
                      onClick={() =>
                        setFilterCats((prev) => {
                          const n = new Set(prev);
                          if (n.has(sub)) n.delete(sub);
                          else n.add(sub);
                          return n;
                        })
                      }
                      className={`px-2 py-0.5 rounded-md border text-[11px] ${
                        active
                          ? 'bg-coral-500 text-white border-coral-500'
                          : 'bg-white dark:bg-white/5 border-amber-200/70 dark:border-white/10'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {candidates.map((s) => {
                const inRep = repSongIds.has(s.id);
                const checked = selectedCandidates.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                      inRep
                        ? 'opacity-50 bg-amber-100/40 dark:bg-white/5'
                        : 'hover:bg-amber-100/70 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        disabled={inRep}
                        checked={checked || inRep}
                        onChange={() =>
                          setSelectedCandidates((prev) => {
                            const n = new Set(prev);
                            if (n.has(s.id)) n.delete(s.id);
                            else n.add(s.id);
                            return n;
                          })
                        }
                        className="rounded accent-coral-500"
                      />
                      <span className="truncate font-medium">{s.title}</span>
                    </span>
                    <span className="text-[11px] text-ink/55 dark:text-cream-100/55 shrink-0">
                      {inRep ? 'En repertorio' : s.key || '—'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right: Current Order */}
          <div className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-amber-200/75 dark:border-white/10 space-y-2.5">
            <h4 className="text-xs font-semibold">Orden y tonos del repertorio</h4>
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {repertoire.songs.length === 0 ? (
                <p className="text-xs text-ink/55 dark:text-cream-100/50 py-8 text-center">
                  Selecciona canciones de la izquierda para agregarlas aquí.
                </p>
              ) : (
                repertoire.songs.map((entry, idx) => {
                  const s = songMap.get(entry.id);
                  if (!s) return null;
                  const orig = detectOriginalRoot(s);
                  const eff = orig ? shiftNote(orig, entry.transpose) : null;
                  const effDisplay = eff ? formatRootForDisplay(eff, chordNotation) : '';
                  return (
                    <div
                      key={`${entry.id}-${idx}`}
                      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/70 dark:border-white/10 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">
                          {idx + 1}. {s.title}
                        </p>
                        <p className="text-[11px] text-ink/60 dark:text-cream-100/60">
                          {effDisplay ? `Tono: ${effDisplay}` : s.key || 'Sin tono'}
                          {entry.transpose !== 0 && (
                            <span className="ml-1 font-mono text-coral-600 dark:text-coral-300">
                              ({entry.transpose > 0 ? `+${entry.transpose}` : entry.transpose})
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const next = repertoire.songs.map((it, i) =>
                              i === idx ? { ...it, transpose: it.transpose - 1 } : it
                            );
                            onUpdateRepertoire({ ...repertoire, songs: next });
                          }}
                          aria-label={`Bajar tono a ${s.title}`}
                          className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-white/10 font-bold"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = repertoire.songs.map((it, i) =>
                              i === idx ? { ...it, transpose: it.transpose + 1 } : it
                            );
                            onUpdateRepertoire({ ...repertoire, songs: next });
                          }}
                          aria-label={`Subir tono a ${s.title}`}
                          className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-white/10 font-bold"
                        >
                          +
                        </button>
                        <select
                          aria-label={`Posición de ${s.title}`}
                          value={idx}
                          onChange={(e) => moveEntry(idx, Number(e.target.value))}
                          className="px-1 py-0.5 rounded bg-white dark:bg-nightbg-100 border border-amber-200 dark:border-white/10 text-[11px] tabular-nums"
                        >
                          {repertoire.songs.map((_, pos) => (
                            <option key={pos} value={pos}>
                              #{pos + 1}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveEntry(idx, idx - 1)}
                          aria-label={`Subir ${s.title}`}
                          className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-white/10 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === repertoire.songs.length - 1}
                          onClick={() => moveEntry(idx, idx + 1)}
                          aria-label={`Bajar ${s.title}`}
                          className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-white/10 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = repertoire.songs.filter((_, i) => i !== idx);
                            onUpdateRepertoire({ ...repertoire, songs: next });
                          }}
                          aria-label={`Quitar ${s.title}`}
                          className="p-1 text-coral-500 hover:bg-coral-100 dark:hover:bg-coral-500/20 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-amber-200/50 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold"
          >
            Listo
          </button>
          <button
            type="button"
            disabled={repertoire.songs.length === 0}
            onClick={() => onPlayRepertoire(repertoire.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            Hojear este repertorio
          </button>
        </div>
      </div>
    </div>
  );
};
