import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  ListMusic,
  Lock,
  Plus,
  Printer,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ChordNotation,
  KeyLockState,
  MainCategory,
  Repertoire,
  Song,
  SongbookData,
} from '../types/songbook';
import {
  getSongDisplayCategories,
  getVisibleRepertoires,
  songHasAnyCategory,
  SYSTEM_MAIN_IDS,
} from '../utils/categories';
import {
  computeSongTransposeForKeyLock,
  detectOriginalRoot,
  formatRootForDisplay,
  NOTES_SHARP,
  shiftNote,
} from '../utils/chords';

interface SongListViewProps {
  data: SongbookData;
  filteredSongs: Song[];
  activeMainCategoryId: string | null;
  resolvedParent: MainCategory | null;
  activeSubcategories: string[];
  search: string;
  onlyPending: boolean;
  keyLock: KeyLockState;
  listTransposeMap: Record<string, number>;
  currentRepertoireId: string | null;
  logoUrl: string;
  onToggleOnlyPending: () => void;
  onClearSearch: () => void;
  onShowAll: () => void;
  onSelectMainCategory: (id: string) => void;
  onToggleSubcategory: (sub: string, parentId?: string) => void;
  onClearSubcategories: () => void;
  onOpenNewSong: () => void;
  onOpenRepertoires: () => void;
  onOpenOrganizer: () => void;
  onOpenPrint: () => void;
  onToggleKeyLock: (active: boolean) => void;
  onChangeKeyLockRoot: (root: string) => void;
  onToggleRepertoiresBar: () => void;
  onPlayRepertoire: (repId: string) => void;
  onMoveRepertoire: (repId: string, delta: number) => void;
  onToggleRepertoirePinned: (repId: string, pinned: boolean) => void;
  onOpenSong: (songId: string) => void;
  onTransposeSongInList: (songId: string, delta: number) => void;
  onToggleFavorite: (songId: string) => void;
  onToggleEucaristica: (songId: string) => void;
  onEditSong: (songId: string) => void;
  onDeleteSong: (songId: string) => void;
}

export const SongListView: React.FC<SongListViewProps> = ({
  data,
  filteredSongs,
  activeMainCategoryId,
  resolvedParent,
  activeSubcategories,
  search,
  onlyPending,
  keyLock,
  listTransposeMap,
  currentRepertoireId,
  logoUrl,
  onToggleOnlyPending,
  onClearSearch,
  onShowAll,
  onSelectMainCategory,
  onToggleSubcategory,
  onClearSubcategories,
  onOpenNewSong,
  onOpenRepertoires,
  onOpenOrganizer,
  onOpenPrint,
  onToggleKeyLock,
  onChangeKeyLockRoot,
  onToggleRepertoiresBar,
  onPlayRepertoire,
  onMoveRepertoire,
  onToggleRepertoirePinned,
  onOpenSong,
  onTransposeSongInList,
  onToggleFavorite,
  onToggleEucaristica,
  onEditSong,
  onDeleteSong,
}) => {
  const [listFilterOpen, setListFilterOpen] = useState(false);
  const [configuringReps, setConfiguringReps] = useState(false);

  const chordNotation: ChordNotation = data.settings.chordNotation || 'american';
  const visibleRepertoires: Repertoire[] = getVisibleRepertoires(data);
  const totalRepertoires = data.repertoires.length;
  const hiddenCount = Math.max(0, totalRepertoires - visibleRepertoires.length);

  const pendingCount = useMemo(
    () => data.songs.filter((s) => !songHasAnyCategory(s) || !s.key).length,
    [data.songs]
  );

  const listTitle = useMemo(() => {
    if (onlyPending) return 'Pendientes por ordenar';
    if (activeSubcategories.length === 1) return activeSubcategories[0];
    if (activeSubcategories.length > 1) return `${activeSubcategories.length} subcategorías`;
    if (activeMainCategoryId) {
      const mc = data.mainCategories.find((m) => m.id === activeMainCategoryId);
      if (mc) return mc.name;
    }
    if (search.trim()) return `Resultados para "${search.trim()}"`;
    return 'Todas las canciones';
  }, [onlyPending, activeSubcategories, activeMainCategoryId, data.mainCategories, search]);

  const filterBadgeLabel = useMemo(() => {
    if (activeSubcategories.length > 0) {
      return activeSubcategories.length === 1
        ? activeSubcategories[0]
        : `${activeSubcategories.length} subcat.`;
    }
    if (activeMainCategoryId) {
      const mc = data.mainCategories.find((m) => m.id === activeMainCategoryId);
      return mc ? mc.name : '';
    }
    return '';
  }, [activeSubcategories, activeMainCategoryId, data.mainCategories]);

  const isEmptyLibrary = data.songs.length === 0;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {isEmptyLibrary ? (
        <div className="text-center py-14 max-w-md mx-auto">
          <img
            src={logoUrl}
            alt="Logo Cancionero RCC Arica"
            className="w-24 h-24 rounded-full mx-auto mb-5 object-cover shadow-md border-2 border-amber-300 dark:border-amber-400/50 bg-white"
          />
          <h2 className="font-display text-2xl font-semibold mb-2">Cancionero RCC Arica</h2>
          <p className="text-sm text-ink/70 dark:text-cream-100/70 mb-6">
            Comienza agregando tu primera canción con letra y acordes, o importa un respaldo JSON.
          </p>
          <button
            type="button"
            onClick={onOpenNewSong}
            className="inline-flex items-center gap-2 bg-coral-500 hover:bg-coral-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Crear primera canción
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{listTitle}</h2>
              <p className="text-xs text-ink/60 dark:text-cream-100/55 mt-0.5 tabular-nums">
                {filteredSongs.length} {filteredSongs.length === 1 ? 'canción' : 'canciones'}
                {search.trim() && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={onClearSearch}
                      className="text-coral-600 dark:text-coral-300 hover:underline font-medium"
                    >
                      Limpiar búsqueda
                    </button>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenNewSong}
                className="inline-flex items-center gap-1.5 bg-coral-500 hover:bg-coral-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva canción
              </button>
              <button
                type="button"
                onClick={onOpenRepertoires}
                className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
              >
                <ListMusic className="w-3.5 h-3.5" />
                Repertorios
              </button>
              <button
                type="button"
                onClick={onOpenOrganizer}
                className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Ordenar
              </button>
              <button
                type="button"
                onClick={onOpenPrint}
                className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => setListFilterOpen((v) => !v)}
                aria-expanded={listFilterOpen}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                  listFilterOpen || filterBadgeLabel
                    ? 'bg-coral-500/10 text-coral-600 dark:text-coral-300 border-coral-300/60 dark:border-coral-400/40'
                    : 'bg-cream-50 dark:bg-nightbg-50 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtrar{filterBadgeLabel ? `: ${filterBadgeLabel}` : ''}
              </button>
              {(pendingCount > 0 || onlyPending) && (
                <button
                  type="button"
                  onClick={onToggleOnlyPending}
                  aria-pressed={onlyPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap tabular-nums ${
                    onlyPending
                      ? 'bg-coral-500 text-white shadow-sm'
                      : 'bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20'
                  }`}
                >
                  {onlyPending ? 'Ver todas' : `Solo pendientes (${pendingCount})`}
                </button>
              )}
            </div>
          </div>

          {listFilterOpen && (
            <section
              aria-label="Filtros por categoría"
              className="mb-4 p-3.5 rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/75 dark:border-white/10 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink/80 dark:text-cream-100/80">
                  Categorías principales
                </span>
                {(activeMainCategoryId || activeSubcategories.length > 0) && (
                  <button
                    type="button"
                    onClick={onShowAll}
                    className="text-xs font-medium text-coral-600 dark:text-coral-300 hover:underline whitespace-nowrap"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onShowAll}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                    !activeMainCategoryId && activeSubcategories.length === 0
                      ? 'bg-coral-500 text-white border-coral-500 font-semibold'
                      : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                  }`}
                >
                  Todas
                </button>
                {data.mainCategories.map((mc) => {
                  const direct = activeMainCategoryId === mc.id && activeSubcategories.length === 0;
                  const parentActive = !direct && resolvedParent?.id === mc.id;
                  return (
                    <button
                      key={mc.id}
                      type="button"
                      onClick={() => onSelectMainCategory(mc.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                        direct
                          ? 'bg-coral-500 text-white border-coral-500 font-semibold'
                          : parentActive
                          ? 'bg-amber-100 dark:bg-white/15 border-amber-400 font-semibold'
                          : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                      }`}
                    >
                      {mc.id !== SYSTEM_MAIN_IDS.GRUPO && mc.icon && <span aria-hidden="true">{mc.icon}</span>}
                      <span>{mc.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2.5 border-t border-amber-200/50 dark:border-white/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-ink/80 dark:text-cream-100/80">
                    {resolvedParent ? `Subcategorías de ${resolvedParent.name}` : 'Todas las subcategorías'}
                  </span>
                  {activeSubcategories.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearSubcategories}
                      className="text-xs font-medium text-coral-600 dark:text-coral-300 hover:underline whitespace-nowrap"
                    >
                      Quitar filtro ({activeSubcategories.length})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(resolvedParent
                    ? resolvedParent.subcategories.map((sub) => ({ sub, parentId: resolvedParent.id }))
                    : data.mainCategories.flatMap((mc) =>
                        mc.subcategories.map((sub) => ({ sub, parentId: mc.id }))
                      )
                  ).map(({ sub, parentId }) => {
                    const active = activeSubcategories.includes(sub);
                    return (
                      <button
                        key={`${parentId}-${sub}`}
                        type="button"
                        onClick={() => onToggleSubcategory(sub, parentId)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-coral-500 text-white border-coral-500 font-semibold'
                            : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/70 dark:border-white/10'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Global Key Lock bar */}
          <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/70 dark:border-white/10 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={keyLock.active}
                onChange={(e) => onToggleKeyLock(e.target.checked)}
                className="rounded accent-coral-500"
              />
              <Lock className="w-3.5 h-3.5 text-coral-500 dark:text-coral-300 shrink-0" />
              <span>Tonalidad fija para todo el listado</span>
            </label>

            {keyLock.active && (
              <div className="flex items-center gap-2">
                <span className="text-ink/60 dark:text-cream-100/60">Tono destino:</span>
                <select
                  aria-label="Tonalidad fija destino"
                  value={keyLock.root || 'C'}
                  onChange={(e) => onChangeKeyLockRoot(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-nightbg-100 border border-amber-200 dark:border-white/10 font-semibold text-coral-600 dark:text-coral-300"
                >
                  {NOTES_SHARP.map((n) => (
                    <option key={n} value={n}>
                      {formatRootForDisplay(n, chordNotation)} ({n})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Repertoires bar */}
          {totalRepertoires > 0 && (
            <section
              aria-label="Repertorios rápidos"
              className="mb-5 rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/70 dark:border-white/10 px-3.5 py-2.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onToggleRepertoiresBar}
                  aria-expanded={data.settings.repertoiresBarOpen}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/80 dark:text-cream-100/80 hover:text-coral-600 dark:hover:text-coral-300"
                >
                  <ListMusic className="w-3.5 h-3.5 text-coral-500 dark:text-coral-300" />
                  <span>Repertorios</span>
                  <span className="text-ink/50 dark:text-cream-100/50 tabular-nums">
                    ({visibleRepertoires.length}/{totalRepertoires})
                  </span>
                  {data.settings.repertoiresBarOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {data.settings.repertoiresBarOpen && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfiguringReps((v) => !v)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors whitespace-nowrap ${
                        configuringReps
                          ? 'bg-coral-500 text-white border-coral-500'
                          : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                      }`}
                    >
                      {configuringReps ? 'Listo' : 'Organizar barra'}
                    </button>
                  </div>
                )}
              </div>

              {data.settings.repertoiresBarOpen && (
                <div className="mt-2.5">
                  {configuringReps ? (
                    <div className="space-y-1.5">
                      {data.repertoires.map((rep, idx) => (
                        <div
                          key={rep.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-white/5 border border-amber-200/70 dark:border-white/10 text-xs"
                        >
                          <span className="font-medium truncate">
                            {rep.name}{' '}
                            <span className="text-ink/50 dark:text-cream-100/50 tabular-nums">
                              ({rep.songs.length})
                            </span>
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onMoveRepertoire(rep.id, -1)}
                              disabled={idx === 0}
                              aria-label={`Subir ${rep.name}`}
                              className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-white/10 disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveRepertoire(rep.id, 1)}
                              disabled={idx === data.repertoires.length - 1}
                              aria-label={`Bajar ${rep.name}`}
                              className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-white/10 disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleRepertoirePinned(rep.id, !rep.pinnedInBar)}
                              aria-label={rep.pinnedInBar ? `Ocultar ${rep.name}` : `Mostrar ${rep.name}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${
                                rep.pinnedInBar
                                  ? 'bg-coral-500 text-white'
                                  : 'bg-amber-100 dark:bg-white/10 text-ink/70 dark:text-cream-100/70'
                              }`}
                            >
                              {rep.pinnedInBar ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{rep.pinnedInBar ? 'Visible' : 'Oculto'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : visibleRepertoires.length === 0 ? (
                    <p className="text-xs text-ink/55 dark:text-cream-100/50">
                      Todos los repertorios están ocultos ({hiddenCount}). Usa &quot;Organizar barra&quot; para mostrarlos.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {visibleRepertoires.map((rep) => {
                        const isActiveRep = currentRepertoireId === rep.id;
                        return (
                          <button
                            key={rep.id}
                            type="button"
                            onClick={() => onPlayRepertoire(rep.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
                              isActiveRep
                                ? 'bg-coral-500 text-white border-coral-500 shadow-sm'
                                : 'bg-white/85 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                            }`}
                          >
                            <span>▶ {rep.name}</span>
                            <span
                              className={`tabular-nums ${
                                isActiveRep ? 'text-white/85' : 'text-ink/55 dark:text-cream-100/55'
                              }`}
                            >
                              ({rep.songs.length})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Song Grid */}
          {filteredSongs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/70 dark:border-white/10">
              <p className="text-sm text-ink/70 dark:text-cream-100/70 mb-3">
                No encontramos cantos con esos filtros.
              </p>
              <button
                type="button"
                onClick={onShowAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Mostrar todos los cantos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSongs.map((s) => {
                const tr = keyLock.active
                  ? computeSongTransposeForKeyLock(s, keyLock)
                  : listTransposeMap[s.id] || 0;
                const origRoot = detectOriginalRoot(s);
                const effectiveRoot = origRoot ? shiftNote(origRoot, tr) : null;
                const effectiveDisplay = effectiveRoot
                  ? formatRootForDisplay(effectiveRoot, chordNotation)
                  : '';
                const cats = getSongDisplayCategories(s, data.mainCategories);

                const tonePart = s.key
                  ? `Tono: ${s.key}${tr && effectiveDisplay ? ` → ${effectiveDisplay}` : ''}`
                  : effectiveDisplay
                  ? `Tono: ${effectiveDisplay}`
                  : 'Sin tono';
                const metadataLine = [tonePart, ...cats].join(' · ');

                return (
                  <article
                    key={s.id}
                    className="group rounded-2xl bg-cream-50 dark:bg-nightbg-50 border border-amber-200/75 dark:border-white/10 p-4 flex flex-col justify-between gap-3 hover:border-coral-300 dark:hover:border-coral-400/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenSong(s.id)}
                          className="text-left min-w-0 flex-1 group/title"
                        >
                          <h3 className="font-display text-lg font-semibold leading-snug text-ink-900 dark:text-cream-50 group-hover/title:text-coral-600 dark:group-hover/title:text-coral-300 transition-colors line-clamp-2">
                            {s.title}
                          </h3>
                        </button>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => onToggleEucaristica(s.id)}
                            aria-pressed={s.eucaristica}
                            aria-label={s.eucaristica ? 'Quitar de Eucaristía' : 'Marcar como Eucaristía'}
                            title={s.eucaristica ? 'Quitar de Eucaristía' : 'Marcar como Eucaristía'}
                            className={`px-1.5 py-0.5 rounded-lg text-sm transition-opacity ${
                              s.eucaristica
                                ? 'opacity-100 bg-amber-100/80 dark:bg-white/10'
                                : 'opacity-30 hover:opacity-80'
                            }`}
                          >
                            ✝️
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(s.id)}
                            aria-pressed={s.favorite}
                            aria-label={s.favorite ? 'Quitar de favoritas' : 'Agregar a favoritas'}
                            title={s.favorite ? 'Quitar de favoritas' : 'Agregar a favoritas'}
                            className={`p-1 rounded-lg transition-colors ${
                              s.favorite
                                ? 'text-amber-500'
                                : 'text-ink/25 dark:text-cream-100/25 hover:text-amber-500'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${s.favorite ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Zero-pill typographic metadata line */}
                      <p className="text-xs text-ink/65 dark:text-cream-100/60 mt-1.5 truncate">
                        {metadataLine}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-amber-200/50 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                      <div className="inline-flex items-center gap-1">
                        {!keyLock.active ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onTransposeSongInList(s.id, -1)}
                              aria-label={`Bajar medio tono a ${s.title}`}
                              className="px-2 py-1 rounded-lg bg-amber-100/75 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 font-semibold tabular-nums"
                            >
                              -1
                            </button>
                            <span className="min-w-[2.2rem] text-center font-mono text-[11px] font-semibold text-coral-600 dark:text-coral-300 tabular-nums">
                              {tr === 0 ? 'Orig' : tr > 0 ? `+${tr}` : tr}
                            </span>
                            <button
                              type="button"
                              onClick={() => onTransposeSongInList(s.id, 1)}
                              aria-label={`Subir medio tono a ${s.title}`}
                              className="px-2 py-1 rounded-lg bg-amber-100/75 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 font-semibold tabular-nums"
                            >
                              +1
                            </button>
                          </>
                        ) : (
                          <span className="font-mono text-[11px] font-semibold text-coral-600 dark:text-coral-300">
                            Fijo en {effectiveDisplay || formatRootForDisplay(keyLock.root, chordNotation)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditSong(s.id)}
                          className="px-2.5 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 font-medium whitespace-nowrap"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSong(s.id)}
                          aria-label={`Eliminar ${s.title}`}
                          className="p-1.5 rounded-lg text-ink/45 dark:text-cream-100/45 hover:text-coral-600 hover:bg-coral-100/60 dark:hover:bg-coral-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
