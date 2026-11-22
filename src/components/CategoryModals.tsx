import React, { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { MainCategory } from '../types/songbook';
import { SYSTEM_MAIN_IDS } from '../utils/categories';

interface CategoryManagerModalProps {
  open: boolean;
  mainCategories: MainCategory[];
  onClose: () => void;
  onAddMain: (name: string, icon: string) => boolean;
  onRenameMain: (mainId: string, newName: string) => void;
  onDeleteMain: (mainId: string) => void;
  onOpenSubcategoriesFor: (mainId: string) => void;
  onOpenOrganizer: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  open,
  mainCategories,
  onClose,
  onAddMain,
  onRenameMain,
  onDeleteMain,
  onOpenSubcategoriesFor,
  onOpenOrganizer,
}) => {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📁');

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
      aria-label="Categorías principales"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-xl p-5 max-h-[88vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg font-semibold">Categorías principales</h3>
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
            if (onAddMain(newName, newIcon)) {
              setNewName('');
            }
          }}
          className="mb-4 p-3 rounded-xl bg-amber-100/45 dark:bg-white/5 border border-amber-200/60 dark:border-white/10"
        >
          <p className="text-xs font-semibold mb-2">Crear nueva categoría principal</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Retiros, Jóvenes, Misión..."
              aria-label="Nombre de nueva categoría principal"
              className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-coral-300"
              autoFocus
            />
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              aria-label="Ícono de la categoría"
              className="px-2.5 py-1.5 rounded-xl bg-white/85 dark:bg-nightbg-100 border border-amber-200 dark:border-white/10 text-xs"
            >
              <option value="📁">📁 Carpeta</option>
              <option value="🎵">🎵 Música</option>
              <option value="🕊️">🕊️ Espíritu / Paz</option>
              <option value="🔥">🔥 Fuego</option>
              <option value="🙌">🙌 Alabanza</option>
              <option value="📖">📖 Palabra</option>
              <option value="💛">💛 Corazón</option>
            </select>
            <button
              type="submit"
              className="bg-coral-500 hover:bg-coral-600 text-white px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            >
              + Crear
            </button>
          </div>
        </form>

        <div className="space-y-2 mb-4">
          {mainCategories.map((mc) => (
            <div
              key={mc.id}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-amber-200/80 dark:border-white/10"
            >
              <span aria-hidden="true" className="text-base shrink-0">
                {mc.icon || '📁'}
              </span>
              <input
                defaultValue={mc.name}
                key={mc.id + mc.name}
                aria-label={`Nombre de categoría principal ${mc.name}`}
                onBlur={(e) => {
                  if (e.target.value.trim() !== mc.name) {
                    onRenameMain(mc.id, e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-sm font-semibold"
              />
              <span className="text-[11px] text-ink/55 dark:text-cream-100/50 tabular-nums whitespace-nowrap">
                {mc.subcategories.length} subcat.
              </span>
              <button
                type="button"
                onClick={() => onOpenSubcategoriesFor(mc.id)}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 font-medium whitespace-nowrap"
              >
                + Sub
              </button>
              {mc.system ? (
                <span className="text-[11px] text-ink/45 dark:text-cream-100/40 px-1.5 whitespace-nowrap">Base</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeleteMain(mc.id)}
                  aria-label={`Eliminar categoría ${mc.name}`}
                  className="text-coral-500 hover:bg-coral-100 dark:hover:bg-coral-500/20 p-1.5 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-amber-200/50 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpenSubcategoriesFor(SYSTEM_MAIN_IDS.GRUPO)}
            className="text-xs px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/5 hover:bg-amber-200 dark:hover:bg-white/10 font-medium"
          >
            Gestionar subcategorías
          </button>
          <button
            type="button"
            onClick={onOpenOrganizer}
            className="text-xs px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-white/5 hover:bg-amber-200 dark:hover:bg-white/10 font-medium"
          >
            Ordenar canciones (tonos y categorías)
          </button>
        </div>
      </div>
    </div>
  );
};

interface SubcategoryManagerModalProps {
  open: boolean;
  preselectedParentId: string;
  mainCategories: MainCategory[];
  onClose: () => void;
  onAddSub: (parentId: string, subName: string) => boolean;
  onRenameSub: (parentId: string, oldName: string, newName: string) => void;
  onMoveSub: (fromParentId: string, toParentId: string, subName: string) => void;
  onDeleteSub: (parentId: string, subName: string) => void;
}

export const SubcategoryManagerModal: React.FC<SubcategoryManagerModalProps> = ({
  open,
  preselectedParentId,
  mainCategories,
  onClose,
  onAddSub,
  onRenameSub,
  onMoveSub,
  onDeleteSub,
}) => {
  const [subName, setSubName] = useState('');
  const [parentId, setParentId] = useState(preselectedParentId || SYSTEM_MAIN_IDS.GRUPO);

  useEffect(() => {
    setParentId(preselectedParentId || SYSTEM_MAIN_IDS.GRUPO);
  }, [preselectedParentId, open]);

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
      aria-label="Subcategorías"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-2xl p-5 max-h-[88vh] overflow-y-auto border border-amber-200/70 dark:border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg font-semibold">Subcategorías</h3>
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
            if (onAddSub(parentId, subName)) {
              setSubName('');
            }
          }}
          className="mb-4 p-3 rounded-xl bg-amber-100/45 dark:bg-white/5 border border-amber-200/60 dark:border-white/10"
        >
          <p className="text-xs font-semibold mb-2">Nueva subcategoría (elige su categoría superior)</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Ej: Envío, Meditación, Consagración..."
              aria-label="Nombre de nueva subcategoría"
              className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-coral-300"
              autoFocus
            />
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              aria-label="Categoría superior"
              className="px-2.5 py-1.5 rounded-xl bg-white/85 dark:bg-nightbg-100 border border-amber-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-coral-300"
            >
              {mainCategories.map((mc) => (
                <option key={mc.id} value={mc.id}>
                  {mc.icon || '📁'} {mc.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-coral-500 hover:bg-coral-600 text-white px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            >
              + Nueva subcategoría
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {mainCategories.map((mc) => (
            <div
              key={mc.id}
              className="p-3 rounded-xl bg-white/55 dark:bg-white/5 border border-amber-200/80 dark:border-white/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <span aria-hidden="true">{mc.icon || '📁'}</span>
                <h4 className="text-sm font-semibold">{mc.name}</h4>
              </div>
              <div className="pl-3 space-y-1.5">
                {mc.subcategories.length === 0 ? (
                  <p className="text-xs text-ink/50 dark:text-cream-100/40 italic">Sin subcategorías aún.</p>
                ) : (
                  mc.subcategories.map((sub) => (
                    <div key={sub} className="flex items-center gap-1.5">
                      <input
                        defaultValue={sub}
                        key={mc.id + sub}
                        aria-label={`Nombre de subcategoría ${sub}`}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== sub) {
                            onRenameSub(mc.id, sub, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                        className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-white/85 dark:bg-white/5 border border-amber-200 dark:border-white/10 text-xs"
                      />
                      <select
                        value={mc.id}
                        aria-label={`Mover ${sub} a categoría`}
                        title="Mover a otra categoría principal"
                        onChange={(e) => onMoveSub(mc.id, e.target.value, sub)}
                        className="max-w-[165px] px-2 py-1 rounded-lg bg-white/85 dark:bg-nightbg-100 border border-amber-200 dark:border-white/10 text-xs"
                      >
                        {mainCategories.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onDeleteSub(mc.id, sub)}
                        aria-label={`Eliminar subcategoría ${sub}`}
                        className="text-coral-500 hover:bg-coral-100 dark:hover:bg-coral-500/20 p-1.5 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
