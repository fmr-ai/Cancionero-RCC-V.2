import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Guitar,
  Lock,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { ChordNotation, MainCategory, Song } from '../types/songbook';
import { getSongDisplayCategories } from '../utils/categories';
import {
  detectOriginalRoot,
  extractUniqueChords,
  formatRootForDisplay,
  NOTES_SHARP,
  parseSongContentLines,
  shiftNote,
  suggestCapoPositions,
} from '../utils/chords';

interface SongReaderViewProps {
  song: Song;
  mainCategories: MainCategory[];
  chordNotation: ChordNotation;
  fontSize: number;
  currentTranspose: number;
  positionLabel: string;
  canPrev: boolean;
  canNext: boolean;
  repertoireName: string | null;
  keyLocked: boolean;
  lockedRoot: string | null;
  isStageMode: boolean;
  lyricsOnly: boolean;
  isGuestPreviewSong: boolean;
  isHostSync: boolean;
  onBackToList: () => void;
  onPrevSong: () => void;
  onNextSong: () => void;
  onTransposeDelta: (delta: number) => void;
  onChangeFontSize: (delta: number) => void;
  onToggleKeyLock: (active: boolean) => void;
  onChangeKeyLockRoot: (root: string) => void;
  onToggleLyricsOnly: () => void;
  onToggleStageMode: () => void;
  onToggleEucaristica: () => void;
  onToggleFavorite: () => void;
  onEditSong: () => void;
  onDeleteSong: () => void;
  onOpenChordDiagram: (chord: { american: string; display: string }) => void;
  onSaveGuestSong: (song: Song) => void;
  onExitRepertoire: () => void;
}

export const SongReaderView: React.FC<SongReaderViewProps> = ({
  song,
  mainCategories,
  chordNotation,
  fontSize,
  currentTranspose,
  positionLabel,
  canPrev,
  canNext,
  repertoireName,
  keyLocked,
  lockedRoot,
  isStageMode,
  lyricsOnly,
  isGuestPreviewSong,
  isHostSync,
  onBackToList,
  onPrevSong,
  onNextSong,
  onTransposeDelta,
  onChangeFontSize,
  onToggleKeyLock,
  onChangeKeyLockRoot,
  onToggleLyricsOnly,
  onToggleStageMode,
  onToggleEucaristica,
  onToggleFavorite,
  onEditSong,
  onDeleteSong,
  onOpenChordDiagram,
  onSaveGuestSong,
  onExitRepertoire,
}) => {
  const [scrolling, setScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(40);
  const [capoOpen, setCapoOpen] = useState(false);
  const [activeCapoFret, setActiveCapoFret] = useState<number>(0);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Reset capo helper when changing songs
  useEffect(() => {
    setActiveCapoFret(0);
    setCapoOpen(false);
  }, [song.id]);

  // Auto-scroll loop
  useEffect(() => {
    if (!scrolling) return;
    let rafId = 0;
    let last = performance.now();
    const container = document.getElementById('mainScroll');

    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (container) {
        container.scrollTop += scrollSpeed * dt;
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
          setScrolling(false);
          return;
        }
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [scrolling, scrollSpeed]);

  // Stop scrolling on Escape or Exit stage mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStageMode) {
        onToggleStageMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isStageMode, onToggleStageMode]);

  const effectiveTranspose = currentTranspose - activeCapoFret;
  const origRoot = detectOriginalRoot(song);
  const soundingRoot = origRoot ? shiftNote(origRoot, currentTranspose) : null;
  const soundingDisplay = soundingRoot ? formatRootForDisplay(soundingRoot, chordNotation) : '';

  const capoBaseChords = useMemo(
    () => extractUniqueChords(song.content, currentTranspose, chordNotation),
    [song.content, currentTranspose, chordNotation]
  );

  const capoSuggestions = useMemo(
    () =>
      suggestCapoPositions(
        capoBaseChords.map((c) => c.american),
        chordNotation
      ),
    [capoBaseChords, chordNotation]
  );

  const displayedChords = useMemo(
    () => extractUniqueChords(song.content, effectiveTranspose, chordNotation),
    [song.content, effectiveTranspose, chordNotation]
  );

  const parsedLines = useMemo(
    () => parseSongContentLines(song.content, effectiveTranspose, chordNotation),
    [song.content, effectiveTranspose, chordNotation]
  );

  const categories = useMemo(
    () => getSongDisplayCategories(song, mainCategories),
    [song, mainCategories]
  );

  const subtitleParts: string[] = [];
  if (song.key) {
    subtitleParts.push(
      `Tono original: ${song.key}${
        currentTranspose && soundingDisplay ? ` → Sonando en ${soundingDisplay}` : ''
      }`
    );
  } else if (soundingDisplay) {
    subtitleParts.push(`Tono: ${soundingDisplay}`);
  }
  if (activeCapoFret > 0) {
    subtitleParts.push(`Cejillo traste ${activeCapoFret}`);
  }
  if (categories.length > 0) {
    subtitleParts.push(categories.join(' · '));
  }

  return (
    <div
      className={
        isStageMode
          ? 'min-h-full bg-cream-100 dark:bg-nightbg p-4 sm:p-8'
          : 'max-w-4xl mx-auto p-3 sm:p-6 pb-24 sm:pb-10'
      }
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
          if (dx > 0 && canPrev) onPrevSong();
          if (dx < 0 && canNext) onNextSong();
        }
      }}
    >
      {/* Active Repertoire Context Banner */}
      {repertoireName && !isStageMode && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-amber-100/75 dark:bg-white/5 border border-amber-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium truncate">
            Repertorio activo: <strong className="font-semibold">{repertoireName}</strong>
          </span>
          <button
            type="button"
            onClick={onExitRepertoire}
            className="text-coral-600 dark:text-coral-300 hover:underline font-semibold whitespace-nowrap shrink-0"
          >
            Salir del repertorio
          </button>
        </div>
      )}

      {/* Guest preview banner when host shares a song not in guest's library */}
      {isGuestPreviewSong && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-coral-500/10 border border-coral-300/60 dark:border-coral-400/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            Estás viendo una canción compartida en vivo por el director que aún no está guardada en tu cancionero.
          </span>
          <button
            type="button"
            onClick={() => onSaveGuestSong(song)}
            className="inline-flex items-center gap-1 bg-coral-500 hover:bg-coral-600 text-white px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Guardar en mi cancionero
          </button>
        </div>
      )}

      {/* Reader Performance Toolbar */}
      <div className="mb-4 rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/75 dark:border-white/10 p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isStageMode && (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100/80 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Listado
            </button>
          )}

          {positionLabel && (
            <span className="px-2 py-1 text-xs font-mono font-semibold text-ink/65 dark:text-cream-100/65 tabular-nums whitespace-nowrap">
              {positionLabel}
            </span>
          )}

          {isHostSync && (
            <span className="text-[11px] font-semibold text-coral-600 dark:text-coral-300 px-1.5 whitespace-nowrap">
              ● En vivo
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Transpose */}
          <div className="inline-flex items-center gap-1 bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 rounded-xl px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => onTransposeDelta(-1)}
              aria-label="Bajar medio tono"
              className="px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 text-xs font-bold tabular-nums"
            >
              -1
            </button>
            <span className="min-w-[2.4rem] text-center text-xs font-mono font-semibold text-coral-600 dark:text-coral-300 tabular-nums">
              {currentTranspose === 0
                ? 'Orig'
                : currentTranspose > 0
                ? `+${currentTranspose}`
                : currentTranspose}
            </span>
            <button
              type="button"
              onClick={() => onTransposeDelta(1)}
              aria-label="Subir medio tono"
              className="px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 text-xs font-bold tabular-nums"
            >
              +1
            </button>
          </div>

          {/* Font size */}
          <div className="inline-flex items-center gap-0.5 bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 rounded-xl px-1 py-0.5">
            <button
              type="button"
              onClick={() => onChangeFontSize(-1)}
              aria-label="Reducir tamaño de letra"
              className="px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 text-xs font-semibold"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => onChangeFontSize(1)}
              aria-label="Aumentar tamaño de letra"
              className="px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 text-xs font-semibold"
            >
              A+
            </button>
          </div>

          {/* Auto scroll */}
          <div className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => setScrolling((v) => !v)}
              aria-pressed={scrolling}
              className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap"
            >
              {scrolling ? <Pause className="w-3.5 h-3.5 text-coral-500" /> : <Play className="w-3.5 h-3.5" />}
              <span>{scrolling ? 'Pausar' : 'Desplazar'}</span>
            </button>
            <input
              type="range"
              min={15}
              max={120}
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              aria-label="Velocidad de desplazamiento"
              className="slider w-14"
            />
          </div>

          {/* Key lock */}
          <div className="inline-flex items-center gap-1 bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 rounded-xl px-2 py-1 text-xs">
            <label className="inline-flex items-center gap-1 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={keyLocked}
                onChange={(e) => onToggleKeyLock(e.target.checked)}
                className="rounded accent-coral-500"
              />
              <Lock className="w-3 h-3 text-coral-500 dark:text-coral-300" />
              <span>Fijar</span>
            </label>
            {keyLocked && (
              <select
                aria-label="Tono fijo"
                value={lockedRoot || 'C'}
                onChange={(e) => onChangeKeyLockRoot(e.target.value)}
                className="ml-1 bg-transparent font-semibold text-coral-600 dark:text-coral-300 focus:outline-none"
              >
                {NOTES_SHARP.map((n) => (
                  <option key={n} value={n} className="bg-cream-50 dark:bg-nightbg-100 text-ink dark:text-cream-100">
                    {formatRootForDisplay(n, chordNotation)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Solo letra toggle */}
          <button
            type="button"
            onClick={onToggleLyricsOnly}
            aria-pressed={lyricsOnly}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
              lyricsOnly
                ? 'bg-coral-500 text-white border-coral-500'
                : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
            }`}
          >
            {lyricsOnly ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{lyricsOnly ? 'Ver acordes' : 'Solo letra'}</span>
          </button>

          {/* Capo calculator */}
          {!lyricsOnly && (
            <button
              type="button"
              onClick={() => setCapoOpen((v) => !v)}
              aria-expanded={capoOpen}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
                capoOpen || activeCapoFret > 0
                  ? 'bg-coral-500 text-white border-coral-500'
                  : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
              }`}
            >
              <Guitar className="w-3.5 h-3.5" />
              <span>{activeCapoFret > 0 ? `Cejillo ${activeCapoFret}` : 'Cejillo'}</span>
            </button>
          )}

          {/* Stage Mode */}
          <button
            type="button"
            onClick={onToggleStageMode}
            aria-pressed={isStageMode}
            title={isStageMode ? 'Salir de modo escenario (Esc)' : 'Modo escenario'}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
              isStageMode
                ? 'bg-coral-500 text-white border-coral-500'
                : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
            }`}
          >
            {isStageMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isStageMode ? 'Salir' : 'Escenario'}</span>
          </button>
        </div>
      </div>

      {/* Capo Calculator Panel */}
      {capoOpen && !lyricsOnly && (
        <div className="mb-4 p-3.5 rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/75 dark:border-white/10 text-xs">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <p className="font-semibold">
              Asistente de Cejillo (Capo){soundingDisplay ? ` — sonando en ${soundingDisplay}` : ''}
            </p>
            <button
              type="button"
              onClick={() => setCapoOpen(false)}
              aria-label="Cerrar asistente de cejillo"
              className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {capoSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-ink/65 dark:text-cream-100/65 mr-1">Sugerencias cómodas:</span>
              {capoSuggestions.map((sug) => (
                <button
                  key={sug.fret}
                  type="button"
                  onClick={() => setActiveCapoFret(sug.fret)}
                  className={`px-2.5 py-1 rounded-lg border font-medium transition-colors whitespace-nowrap ${
                    activeCapoFret === sug.fret
                      ? 'bg-coral-500 text-white border-coral-500'
                      : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                  }`}
                >
                  Traste {sug.fret} (formas de {sug.shapeKey}) · {sug.openCount}/{sug.totalChords} abiertos
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink/65 dark:text-cream-100/65 mr-1">Traste manual:</span>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveCapoFret(f)}
                className={`px-2.5 py-1 rounded-lg border font-semibold tabular-nums transition-colors ${
                  activeCapoFret === f
                    ? 'bg-coral-500 text-white border-coral-500'
                    : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                }`}
              >
                {f === 0 ? 'Sin cejillo' : f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Song Sheet with Side Arrows on Desktop */}
      <div className="relative flex items-start gap-3">
        {canPrev && (
          <button
            type="button"
            onClick={onPrevSong}
            aria-label="Canción anterior"
            title="Canción anterior (←)"
            className="hidden lg:inline-flex sticky top-1/2 -translate-y-1/2 shrink-0 p-2.5 rounded-full bg-cream-50 dark:bg-nightbg-50 border border-amber-200/80 dark:border-white/10 hover:bg-amber-100 dark:hover:bg-white/10 shadow-sm transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <article className="flex-1 min-w-0 rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/75 dark:border-white/10 p-4 sm:p-8 shadow-sm">
          <header className="mb-5 pb-4 border-b border-amber-200/60 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-ink-900 dark:text-cream-50">
                  {song.title}
                </h1>
                {subtitleParts.length > 0 && (
                  <p className="text-xs sm:text-sm text-ink/65 dark:text-cream-100/60 mt-1.5">
                    {subtitleParts.join(' · ')}
                  </p>
                )}
              </div>

              {!isStageMode && !isGuestPreviewSong && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={onToggleEucaristica}
                    aria-pressed={song.eucaristica}
                    title="Eucaristía"
                    className={`px-2 py-1.5 rounded-xl border text-xs transition-colors ${
                      song.eucaristica
                        ? 'bg-amber-100 dark:bg-white/15 border-amber-300'
                        : 'bg-white/80 dark:bg-white/5 border-amber-200/80 dark:border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    ✝️
                  </button>
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    aria-pressed={song.favorite}
                    aria-label="Favorita"
                    title="Favorita"
                    className="p-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 hover:bg-amber-100 dark:hover:bg-white/10"
                  >
                    <Star className={`w-4 h-4 ${song.favorite ? 'text-amber-500 fill-amber-400' : 'text-ink/40 dark:text-cream-100/40'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={onEditSong}
                    aria-label="Editar canción"
                    title="Editar"
                    className="p-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 hover:bg-amber-100 dark:hover:bg-white/10"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteSong}
                    aria-label="Eliminar canción"
                    title="Eliminar"
                    className="p-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 hover:text-coral-600 hover:bg-coral-100/70 dark:hover:bg-coral-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Unique Chords Strip */}
            {!lyricsOnly && displayedChords.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-amber-200/40 dark:border-white/10 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-ink/55 dark:text-cream-100/55 mr-1">
                  Acordes (toca para ver diagrama):
                </span>
                {displayedChords.map((c) => (
                  <button
                    key={c.american}
                    type="button"
                    onClick={() => onOpenChordDiagram(c)}
                    className="px-2 py-0.5 rounded-md bg-amber-100/75 dark:bg-white/10 hover:bg-coral-100 dark:hover:bg-coral-500/25 text-coral-600 dark:text-coral-300 font-mono text-xs font-bold transition-colors"
                  >
                    {c.display}
                  </button>
                ))}
              </div>
            )}
          </header>

          <div
            className="select-text overflow-x-auto pb-1"
            style={{ fontSize: `${isStageMode ? Math.max(fontSize + 2, 18) : fontSize}px` }}
          >
            {parsedLines.map((line, idx) => {
              if (line.kind === 'empty') {
                return (
                  <div key={idx} className="lyric-line">
                    &nbsp;
                  </div>
                );
              }
              if (line.kind === 'chords') {
                if (lyricsOnly) return null;
                return (
                  <div key={idx} className="chord-line">
                    {(line.parts || []).map((part, pIdx) =>
                      part.type === 'space' ? (
                        <React.Fragment key={pIdx}>{part.text}</React.Fragment>
                      ) : (
                        <button
                          key={pIdx}
                          type="button"
                          className="chord-token"
                          onClick={() =>
                            onOpenChordDiagram({
                              american: part.american || part.text,
                              display: part.display || part.text,
                            })
                          }
                          title={`Ver diagrama de ${part.display || part.text}`}
                        >
                          {part.display}
                        </button>
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
            })}
          </div>
        </article>

        {canNext && (
          <button
            type="button"
            onClick={onNextSong}
            aria-label="Siguiente canción"
            title="Siguiente canción (→)"
            className="hidden lg:inline-flex sticky top-1/2 -translate-y-1/2 shrink-0 p-2.5 rounded-full bg-cream-50 dark:bg-nightbg-50 border border-amber-200/80 dark:border-white/10 hover:bg-amber-100 dark:hover:bg-white/10 shadow-sm transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mobile Bottom Prev/Next Navigation */}
      {(canPrev || canNext) && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-cream-50/95 dark:bg-nightbg-100/95 backdrop-blur border border-amber-200 dark:border-white/15 shadow-lg">
          <button
            type="button"
            onClick={onPrevSong}
            disabled={!canPrev}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/10 disabled:opacity-35 text-xs font-semibold whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <span className="text-xs font-mono font-semibold text-ink/70 dark:text-cream-100/70 tabular-nums">
            {positionLabel}
          </span>
          <button
            type="button"
            onClick={onNextSong}
            disabled={!canNext}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/10 disabled:opacity-35 text-xs font-semibold whitespace-nowrap"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
