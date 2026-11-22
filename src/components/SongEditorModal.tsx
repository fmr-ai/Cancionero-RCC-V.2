import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Wand2, X } from 'lucide-react';
import type { ChordNotation, MainCategory, Song } from '../types/songbook';
import {
  convertLatinChordLinesToAmerican,
  parseSongContentLines,
  suggestSongKey,
} from '../utils/chords';

interface SongEditorModalProps {
  open: boolean;
  editingSong: Song | null;
  mainCategories: MainCategory[];
  chordNotation: ChordNotation;
  onClose: () => void;
  onSave: (payload: {
    id: string | null;
    title: string;
    key: string;
    categories: string[];
    mainCategories: string[];
    content: string;
  }) => void;
  onQuickAddSubcategory: (parentId: string, name: string) => boolean;
}

const KEY_SUGGESTIONS = [
  'Do', 'Do#', 'Re', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si',
  'Do menor', 'Re menor', 'Mi menor', 'Fa# menor', 'Sol menor', 'La menor', 'Si menor',
];

export const SongEditorModal: React.FC<SongEditorModalProps> = ({
  open,
  editingSong,
  mainCategories,
  chordNotation,
  onClose,
  onSave,
  onQuickAddSubcategory,
}) => {
  const [title, setTitle] = useState('');
  const [songKey, setSongKey] = useState('');
  const [content, setContent] = useState('');
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [selectedMainCats, setSelectedMainCats] = useState<string[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubParentId, setNewSubParentId] = useState(mainCategories[1]?.id || mainCategories[0]?.id || '');
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingSong) {
      setTitle(editingSong.title);
      setSongKey(editingSong.key);
      setContent(editingSong.content);
      setSelectedSubs([...editingSong.categories]);
      setSelectedMainCats([...editingSong.mainCategories]);
    } else {
      setTitle('');
      setSongKey('');
      setContent('');
      setSelectedSubs([]);
      setSelectedMainCats([]);
    }
    setNewSubName('');
    setNewSubParentId(mainCategories[1]?.id || mainCategories[0]?.id || '');
    setNotice(null);
  }, [open, editingSong, mainCategories]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const previewLines = useMemo(
    () => parseSongContentLines(content, 0, chordNotation),
    [content, chordNotation]
  );

  if (!open) return null;

  const toggleSub = (sub: string) => {
    setSelectedSubs((prev) => (prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]));
  };

  const toggleMain = (id: string) => {
    setSelectedMainCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDetectKey = () => {
    const sug = suggestSongKey({ content });
    if (!sug) {
      setNotice('No se detectaron líneas de acordes válidas (en notación americana C, D, Em...).');
      return;
    }
    setSongKey(sug.key);
    setNotice(`Tonalidad detectada: ${sug.key}${sug.sure ? '' : ' (aproximada)'}`);
  };

  const handleConvertLatin = () => {
    const res = convertLatinChordLinesToAmerican(content);
    if (res.convertedLines === 0) {
      setNotice('No se encontraron líneas con acordes latinos (Do, Re, Mi...).');
      return;
    }
    setContent(res.content);
    setNotice(
      `Se convirtieron ${res.convertedLines} ${res.convertedLines === 1 ? 'línea' : 'líneas'} de Do→C para poder transportar.`
    );
  };

  const handleQuickAddSub = () => {
    const clean = newSubName.trim();
    if (!clean) return;
    const ok = onQuickAddSubcategory(newSubParentId, clean);
    if (ok) {
      setSelectedSubs((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
      setNewSubName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setNotice('Ingresa el título de la canción.');
      return;
    }
    onSave({
      id: editingSong ? editingSong.id : null,
      title: title.trim(),
      key: songKey.trim(),
      categories: selectedSubs,
      mainCategories: selectedMainCats,
      content: content.replace(/\r\n/g, '\n'),
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={editingSong ? 'Editar canción' : 'Nueva canción'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-4xl p-5 max-h-[92vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-xl font-semibold">
            {editingSong ? 'Editar canción' : 'Nueva canción'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-amber-100 dark:hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="songTitleInput" className="block text-xs font-medium mb-1">
                Título
              </label>
              <input
                id="songTitleInput"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ej: Ven Espíritu Santo"
                className="w-full px-3 py-2 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="songKeyInput" className="block text-xs font-medium">
                  Tonalidad original
                </label>
                <button
                  type="button"
                  onClick={handleDetectKey}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-coral-600 dark:text-coral-300 hover:underline whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3" />
                  Detectar tono
                </button>
              </div>
              <input
                id="songKeyInput"
                type="text"
                list="keySuggestionsList"
                value={songKey}
                onChange={(e) => setSongKey(e.target.value)}
                placeholder="Ej: Re o Sol menor"
                className="w-full px-3 py-2 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300"
              />
              <datalist id="keySuggestionsList">
                {KEY_SUGGESTIONS.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Categories Picker */}
          <div>
            <p className="text-xs font-medium mb-1.5">Categorías y subcategorías</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              {mainCategories.map((mc) => {
                const directChecked = selectedMainCats.includes(mc.id);
                return (
                  <div
                    key={mc.id}
                    className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-amber-200/75 dark:border-white/10"
                  >
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer mb-1.5">
                      <input
                        type="checkbox"
                        checked={directChecked}
                        onChange={() => toggleMain(mc.id)}
                        className="rounded accent-coral-500"
                      />
                      <span>
                        {mc.icon} {mc.name}
                      </span>
                    </label>
                    {mc.subcategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {mc.subcategories.map((sub) => {
                          const checked = selectedSubs.includes(sub);
                          return (
                            <label
                              key={sub}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-coral-500 text-white border-coral-500 font-semibold'
                                  : 'bg-cream-50 dark:bg-white/5 border-amber-200/70 dark:border-white/10 hover:bg-amber-100 dark:hover:bg-white/10'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSub(sub)}
                                className="sr-only"
                              />
                              <span>{sub}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAddSub();
                  }
                }}
                placeholder="Añadir nueva subcategoría..."
                aria-label="Nueva subcategoría rápida"
                className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-xs"
              />
              <select
                value={newSubParentId}
                onChange={(e) => setNewSubParentId(e.target.value)}
                aria-label="Categoría padre para subcategoría rápida"
                className="px-2.5 py-1.5 rounded-xl bg-white/85 dark:bg-nightbg-100 border border-amber-200 dark:border-white/10 text-xs"
              >
                {mainCategories.map((mc) => (
                  <option key={mc.id} value={mc.id}>
                    {mc.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleQuickAddSub}
                className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-medium whitespace-nowrap"
              >
                + Añadir subcategoría
              </button>
            </div>
          </div>

          {/* Content & Live Preview */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <label htmlFor="songContentInput" className="text-xs font-medium">
                  Letra y acordes (escribe los acordes en la línea superior en notación americana: C, G, Am, F...)
                </label>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleConvertLatin}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-[11px] font-medium whitespace-nowrap"
                >
                  <Wand2 className="w-3 h-3" />
                  Convertir Do → C
                </button>
                <div className="inline-flex rounded-lg bg-amber-100/70 dark:bg-white/5 p-0.5 text-[11px] font-medium">
                  {(['edit', 'split', 'preview'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setViewMode(m)}
                      className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                        viewMode === m
                          ? 'bg-white dark:bg-nightbg-50 text-ink dark:text-cream-100 shadow-sm font-semibold'
                          : 'text-ink/65 dark:text-cream-100/65'
                      }`}
                    >
                      {m === 'edit' ? 'Editar' : m === 'split' ? 'Dividida' : 'Vista previa'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {notice && (
              <p className="text-xs text-coral-600 dark:text-coral-300 mb-2 font-medium">{notice}</p>
            )}

            <div className={`grid gap-3 ${viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {viewMode !== 'preview' && (
                <textarea
                  id="songContentInput"
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={'C        G        Am       F\nAquí va la letra de la canción...'}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-coral-300"
                />
              )}
              {viewMode !== 'edit' && (
                <div className="p-3.5 rounded-xl bg-white/75 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 max-h-[300px] overflow-auto text-sm">
                  {previewLines.length === 0 || !content.trim() ? (
                    <p className="text-xs text-ink/45 dark:text-cream-100/45 italic">
                      La vista previa de acordes y letra aparecerá aquí.
                    </p>
                  ) : (
                    previewLines.map((line, idx) => {
                      if (line.kind === 'empty') {
                        return (
                          <div key={idx} className="lyric-line">
                            &nbsp;
                          </div>
                        );
                      }
                      if (line.kind === 'chords') {
                        return (
                          <div key={idx} className="chord-line">
                            {(line.parts || []).map((part, pIdx) =>
                              part.type === 'space' ? (
                                <React.Fragment key={pIdx}>{part.text}</React.Fragment>
                              ) : (
                                <span key={pIdx} className="chord-token cursor-default">
                                  {part.display}
                                </span>
                              )
                            )}
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="lyric-line">
                          {line.text}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/50 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-sm font-medium whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-semibold shadow-sm whitespace-nowrap"
            >
              Guardar canción
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
