import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import type {
  ChordNotation,
  MainCategory,
  PaperSize,
  PrintOptions,
  Repertoire,
  Song,
} from '../types/songbook';
import { matchesFilterSets } from '../utils/categories';
import { buildPrintableHTML, type PrintableSongItem } from '../utils/print';

interface PrintModalProps {
  open: boolean;
  songs: Song[];
  repertoires: Repertoire[];
  mainCategories: MainCategory[];
  chordNotation: ChordNotation;
  listTransposeMap: Record<string, number>;
  initialRepertoireId: string | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  open,
  songs,
  repertoires,
  mainCategories,
  chordNotation,
  listTransposeMap,
  initialRepertoireId,
  onClose,
  onToast,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [mode, setMode] = useState<'repertoire' | 'individual'>('individual');
  const [repertoireId, setRepertoireId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterMains, setFilterMains] = useState<Set<string>>(new Set());
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState('Cancionero RCC Arica');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');
  const [columns, setColumns] = useState<1 | 2 | 3>(2);
  const [songsPerPage, setSongsPerPage] = useState(4);
  const [fontSize, setFontSize] = useState(9);
  const [includeChords, setIncludeChords] = useState(true);
  const [includeIndex, setIncludeIndex] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (repertoires.length > 0) {
      const preferred = initialRepertoireId || repertoires[0].id;
      setRepertoireId(preferred);
      setMode('repertoire');
    } else {
      setMode('individual');
      setSelectedIds(new Set(songs.slice(0, 4).map((s) => s.id)));
    }
  }, [open, repertoires, initialRepertoireId, songs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...songs]
      .filter((s) => {
        if (!matchesFilterSets(s, mainCategories, filterMains, filterCats)) return false;
        if (q && !(s.title || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es'));
  }, [songs, mainCategories, filterMains, filterCats, search]);

  const printableList: PrintableSongItem[] = useMemo(() => {
    if (mode === 'repertoire') {
      const rep = repertoires.find((r) => r.id === repertoireId);
      if (!rep) return [];
      return rep.songs
        .map((entry) => {
          const song = songMap.get(entry.id);
          return song ? { song, transpose: entry.transpose || 0 } : null;
        })
        .filter((x): x is PrintableSongItem => x !== null);
    }
    return songs
      .filter((s) => selectedIds.has(s.id))
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es'))
      .map((song) => ({ song, transpose: listTransposeMap[song.id] || 0 }));
  }, [mode, repertoires, repertoireId, songMap, songs, selectedIds, listTransposeMap]);

  const previewHtml = useMemo(() => {
    const opts: PrintOptions = {
      mode,
      repertoireId: mode === 'repertoire' ? repertoireId : null,
      selectedSongIds: Array.from(selectedIds),
      title,
      date,
      paperSize,
      columns,
      songsPerPage,
      fontSize,
      includeChords,
      includeIndex,
    };
    return buildPrintableHTML(printableList, opts, mainCategories, chordNotation);
  }, [
    printableList,
    mode,
    repertoireId,
    selectedIds,
    title,
    date,
    paperSize,
    columns,
    songsPerPage,
    fontSize,
    includeChords,
    includeIndex,
    mainCategories,
    chordNotation,
  ]);

  if (!open) return null;

  const handlePrint = () => {
    if (printableList.length === 0) {
      onToast('Selecciona al menos una canción para imprimir.');
      return;
    }
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    } else {
      onToast('No se pudo abrir la vista de impresión. Usa "Descargar HTML".');
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'cancionero').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast('Archivo HTML listo para imprimir o guardar como PDF.');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Imprimir o exportar cuadernillo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-5xl p-5 max-h-[92vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display text-lg font-semibold">Imprimir o exportar PDF</h3>
            <p className="text-xs text-ink/60 dark:text-cream-100/60 tabular-nums">
              {printableList.length} {printableList.length === 1 ? 'canto seleccionado' : 'cantos seleccionados'}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-3 text-xs">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('repertoire')}
                disabled={repertoires.length === 0}
                className={`flex-1 py-2 px-3 rounded-xl font-semibold border transition-colors whitespace-nowrap disabled:opacity-40 ${
                  mode === 'repertoire'
                    ? 'bg-coral-500 text-white border-coral-500'
                    : 'bg-white/80 dark:bg-white/5 border-amber-200 dark:border-white/10'
                }`}
              >
                Desde repertorio
              </button>
              <button
                type="button"
                onClick={() => setMode('individual')}
                className={`flex-1 py-2 px-3 rounded-xl font-semibold border transition-colors whitespace-nowrap ${
                  mode === 'individual'
                    ? 'bg-coral-500 text-white border-coral-500'
                    : 'bg-white/80 dark:bg-white/5 border-amber-200 dark:border-white/10'
                }`}
              >
                Selección manual
              </button>
            </div>

            {mode === 'repertoire' ? (
              <div>
                <label className="block font-medium mb-1">Repertorio</label>
                <select
                  value={repertoireId}
                  onChange={(e) => setRepertoireId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-nightbg-50 border border-amber-200 dark:border-white/10"
                >
                  {repertoires.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.songs.length})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-white/5 border border-amber-200/75 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Canciones ({selectedIds.size})</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set(filteredCandidates.map((s) => s.id)))}
                      className="text-coral-600 dark:text-coral-300 hover:underline font-medium"
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="text-ink/60 dark:text-cream-100/60 hover:underline"
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar canciones..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10"
                />
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {mainCategories.map((mc) => (
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
                      className={`px-2 py-0.5 rounded border text-[10px] ${
                        filterMains.has(mc.id)
                          ? 'bg-coral-500 text-white border-coral-500'
                          : 'bg-cream-50 dark:bg-white/5 border-amber-200/70 dark:border-white/10'
                      }`}
                    >
                      {mc.name}
                    </button>
                  ))}
                  {mainCategories.flatMap((mc) =>
                    mc.subcategories.map((sub) => (
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
                        className={`px-2 py-0.5 rounded border text-[10px] ${
                          filterCats.has(sub)
                            ? 'bg-coral-500 text-white border-coral-500'
                            : 'bg-white dark:bg-white/5 border-amber-200/70 dark:border-white/10'
                        }`}
                      >
                        {sub}
                      </button>
                    ))
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {filteredCandidates.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() =>
                          setSelectedIds((prev) => {
                            const n = new Set(prev);
                            if (n.has(s.id)) n.delete(s.id);
                            else n.add(s.id);
                            return n;
                          })
                        }
                        className="rounded accent-coral-500"
                      />
                      <span className="truncate">{s.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="block font-medium mb-1">Título del documento</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Tamaño papel</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-nightbg-50 border border-amber-200 dark:border-white/10"
                >
                  <option value="letter">Carta (Letter)</option>
                  <option value="a4">A4</option>
                  <option value="legal">Oficio (Legal)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Columnas</label>
                <select
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-nightbg-50 border border-amber-200 dark:border-white/10"
                >
                  <option value={1}>1 columna</option>
                  <option value={2}>2 columnas</option>
                  <option value={3}>3 columnas</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Cantos por página</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={songsPerPage}
                  onChange={(e) => setSongsPerPage(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-medium mb-1">Tamaño fuente ({fontSize}pt)</label>
                <input
                  type="range"
                  min={7}
                  max={15}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="slider w-full"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChords}
                  onChange={(e) => setIncludeChords(e.target.checked)}
                  className="rounded accent-coral-500"
                />
                <span>Incluir acordes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIndex}
                  onChange={(e) => setIncludeIndex(e.target.checked)}
                  className="rounded accent-coral-500"
                />
                <span>Incluir índice y numeración</span>
              </label>
            </div>
          </div>

          {/* Live Print Preview */}
          <div className="lg:col-span-7 flex flex-col">
            <span className="text-xs font-medium mb-1.5">Vista previa de impresión</span>
            <iframe
              ref={iframeRef}
              title="Vista previa del cuadernillo"
              srcDoc={previewHtml}
              className="w-full flex-1 min-h-[380px] rounded-xl border border-amber-200 dark:border-white/15 bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-amber-200/50 dark:border-white/10">
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar HTML
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
};
