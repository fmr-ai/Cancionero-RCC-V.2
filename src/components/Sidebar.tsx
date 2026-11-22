import React, { useRef } from 'react';
import { ChevronDown, ChevronUp, Download, FolderPlus, ListMusic, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import type { MainCategory, Song } from '../types/songbook';
import { getSongDisplayCategories, SYSTEM_MAIN_IDS } from '../utils/categories';

interface SidebarProps {
  collapsedDesktop: boolean;
  mobileOpen: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  mainCategories: MainCategory[];
  activeMainCategoryId: string | null;
  resolvedParent: MainCategory | null;
  activeSubcategories: string[];
  categoryMenuOpen: boolean;
  onToggleCategoryMenu: () => void;
  onShowAll: () => void;
  onSelectMainCategory: (id: string) => void;
  onSelectSubcategory: (sub: string, parentId?: string) => void;
  onClearSubcategory: () => void;
  filteredSongs: Song[];
  currentSongId: string | null;
  onOpenSong: (songId: string) => void;
  onDeleteSong: (songId: string) => void;
  onCloseSidebar: () => void;
  onOpenNewSong: () => void;
  onOpenCategories: () => void;
  onOpenSubcategories: () => void;
  onOpenRepertoires: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsedDesktop,
  mobileOpen,
  search,
  onSearchChange,
  mainCategories,
  activeMainCategoryId,
  resolvedParent,
  activeSubcategories,
  categoryMenuOpen,
  onToggleCategoryMenu,
  onShowAll,
  onSelectMainCategory,
  onSelectSubcategory,
  onClearSubcategory,
  filteredSongs,
  currentSongId,
  onOpenSong,
  onDeleteSong,
  onCloseSidebar,
  onOpenNewSong,
  onOpenCategories,
  onOpenSubcategories,
  onOpenRepertoires,
  onExport,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAllActive = !activeMainCategoryId && activeSubcategories.length === 0;

  let subEntries: Array<{ sub: string; parentId: string }> = [];
  if (resolvedParent) {
    subEntries = resolvedParent.subcategories.map((sub) => ({ sub, parentId: resolvedParent.id }));
  } else {
    const seen = new Set<string>();
    mainCategories.forEach((mc) => {
      mc.subcategories.forEach((sub) => {
        if (!seen.has(sub)) {
          seen.add(sub);
          subEntries.push({ sub, parentId: mc.id });
        }
      });
    });
  }

  return (
    <>
      <aside
        aria-label="Navegación del cancionero"
        className={`fixed md:static z-30 inset-y-0 left-0 w-[308px] max-w-[88vw] shrink-0 bg-cream-50 dark:bg-nightbg-50 border-r border-amber-200/60 dark:border-white/10 flex flex-col overflow-hidden transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full invisible pointer-events-none md:visible md:pointer-events-auto md:translate-x-0'
        } ${collapsedDesktop ? 'md:w-0 md:opacity-0 md:pointer-events-none md:border-r-0' : ''}`}
      >
        <div className="p-3 border-b border-amber-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-display text-lg font-semibold tracking-tight leading-tight whitespace-nowrap">
              Índice de cantos
            </h2>
            <button
              type="button"
              onClick={onCloseSidebar}
              aria-label="Ocultar panel"
              title="Ocultar panel"
              className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-white/10 shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink/45 dark:text-cream-100/45 pointer-events-none" />
            <input
              id="searchInput"
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar por título, letra o tonalidad"
              placeholder="Buscar título, letra o tono..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-sm placeholder:text-ink/40 dark:placeholder:text-cream-100/40 focus:outline-none focus:ring-2 focus:ring-coral-300"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink dark:text-cream-100/50 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <nav
            aria-label="Categorías principales y subcategorías"
            className="px-3 pt-2.5 pb-2.5 border-b border-amber-200/50 dark:border-white/10 shrink-0 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={onToggleCategoryMenu}
                aria-expanded={categoryMenuOpen}
                className={`flex-1 min-w-0 inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  resolvedParent && !categoryMenuOpen
                    ? 'bg-coral-500 text-white border-coral-500 shadow-sm'
                    : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10 text-ink/85 dark:text-cream-100/85'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                  {resolvedParent ? (
                    <>
                      {resolvedParent.id !== SYSTEM_MAIN_IDS.GRUPO && resolvedParent.icon && (
                        <span className="shrink-0" aria-hidden="true">
                          {resolvedParent.icon}
                        </span>
                      )}
                      <span className="truncate">{resolvedParent.name}</span>
                    </>
                  ) : (
                    <span>{categoryMenuOpen ? 'Categorías' : 'Categorías · Todas'}</span>
                  )}
                </span>
                {categoryMenuOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
              </button>
              {resolvedParent && (
                <button
                  type="button"
                  onClick={onShowAll}
                  aria-label="Mostrar todas las categorías"
                  className="shrink-0 px-2.5 py-1.5 rounded-xl border border-amber-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 text-[11px] font-medium whitespace-nowrap"
                >
                  Todas
                </button>
              )}
            </div>

            {categoryMenuOpen && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  type="button"
                  onClick={onShowAll}
                  aria-pressed={isAllActive}
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                    isAllActive
                      ? 'bg-coral-500 text-white border-coral-500 shadow-sm'
                      : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                  }`}
                >
                  Todas
                </button>
                {mainCategories.map((mc) => {
                  const isDirectActive = activeMainCategoryId === mc.id && activeSubcategories.length === 0;
                  const isParentHighlight = !isDirectActive && resolvedParent?.id === mc.id;
                  return (
                    <button
                      key={mc.id}
                      type="button"
                      onClick={() => onSelectMainCategory(mc.id)}
                      aria-pressed={isDirectActive || isParentHighlight}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                        isDirectActive
                          ? 'bg-coral-500 text-white border-coral-500 shadow-sm font-semibold'
                          : isParentHighlight
                          ? 'bg-amber-100 dark:bg-white/15 border-amber-400 font-semibold'
                          : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                      }`}
                    >
                      {mc.id !== SYSTEM_MAIN_IDS.GRUPO && mc.icon && (
                        <span aria-hidden="true">{mc.icon}</span>
                      )}
                      <span>{mc.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-1.5 border-t border-amber-200/40 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-medium text-ink/65 dark:text-cream-100/60">
                  {resolvedParent ? `Subcategorías · ${resolvedParent.name}` : 'Subcategorías'}
                </span>
                {activeSubcategories.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearSubcategory}
                    className="text-[11px] font-medium text-coral-600 dark:text-coral-300 hover:underline whitespace-nowrap shrink-0"
                  >
                    Ver todas
                  </button>
                )}
              </div>

              <div className={`flex flex-wrap gap-1 pb-0.5 ${!resolvedParent ? 'max-h-[178px] overflow-y-auto pr-0.5' : ''}`}>
                {subEntries.length === 0 ? (
                  <p className="text-[11px] text-ink/50 dark:text-cream-100/45 italic">
                    Sin subcategorías propias. Usa &quot;Subcategorías&quot; abajo para añadir.
                  </p>
                ) : (
                  subEntries.map(({ sub, parentId }) => {
                    const active = activeSubcategories.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => onSelectSubcategory(sub, parentId)}
                        aria-pressed={active}
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-coral-500 text-white border-coral-500 font-semibold'
                            : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/70 dark:border-white/10 text-ink/90 dark:text-cream-100/90'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </nav>

          <div className="px-2.5 py-2" aria-label="Lista de canciones filtradas">
            {filteredSongs.length === 0 ? (
              <p className="text-xs text-ink/55 dark:text-cream-100/45 text-center py-6">
                No hay canciones aquí todavía.
              </p>
            ) : (
              filteredSongs.map((s) => {
                const labels = getSongDisplayCategories(s, mainCategories);
                const isSelected = currentSongId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`group flex items-center justify-between gap-1 mb-0.5 rounded-xl hover:bg-amber-100/80 dark:hover:bg-white/5 transition-colors ${
                      isSelected ? 'bg-amber-200/70 dark:bg-white/10' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenSong(s.id)}
                      className="min-w-0 flex-1 px-2.5 py-1.5 text-left"
                    >
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-ink/60 dark:text-cream-100/50 truncate">
                        {labels.length ? labels.join(' · ') : 'Sin categoría'}
                      </p>
                    </button>
                    <span className="flex items-center gap-1 shrink-0 text-sm">
                      {s.eucaristica && <span title="Eucaristía">✝️</span>}
                      {s.favorite && <span className="text-amber-500" title="Favorita">★</span>}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSong(s.id);
                      }}
                      aria-label={`Eliminar ${s.title}`}
                      title={`Eliminar ${s.title}`}
                      className="shrink-0 p-1.5 text-ink/40 dark:text-cream-100/35 hover:text-coral-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-2.5 border-t border-amber-200/60 dark:border-white/10 grid grid-cols-2 gap-1.5 text-xs font-medium shrink-0 bg-cream-50 dark:bg-nightbg-50">
          <button
            type="button"
            onClick={onOpenNewSong}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 bg-coral-500 hover:bg-coral-600 text-white font-semibold py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nueva canción
          </button>
          <button
            type="button"
            onClick={onOpenCategories}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 bg-amber-100 dark:bg-white/5 hover:bg-amber-200 dark:hover:bg-white/10 py-2 px-2 rounded-xl transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Categorías
          </button>
          <button
            type="button"
            onClick={onOpenSubcategories}
            className="bg-amber-100 dark:bg-white/5 hover:bg-amber-200 dark:hover:bg-white/10 py-2 px-2 rounded-xl transition-colors whitespace-nowrap"
          >
            Subcategorías
          </button>
          <button
            type="button"
            onClick={onOpenRepertoires}
            className="inline-flex items-center justify-center gap-1 bg-amber-100 dark:bg-white/5 hover:bg-amber-200 dark:hover:bg-white/10 py-2 px-2 rounded-xl transition-colors whitespace-nowrap"
          >
            <ListMusic className="w-3.5 h-3.5" />
            Repertorios
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center gap-1 bg-amber-100 dark:bg-white/5 hover:bg-amber-200 dark:hover:bg-white/10 py-2 px-2 rounded-xl transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1 bg-amber-100 dark:bg-white/5 hover:bg-amber-200 dark:hover:bg-white/10 py-2 px-2 rounded-xl transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </aside>

      {mobileOpen && (
        <div
          onClick={onCloseSidebar}
          className="fixed inset-0 bg-black/35 z-20 md:hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
};
