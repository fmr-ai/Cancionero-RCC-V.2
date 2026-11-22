import type { MainCategory, Repertoire, Song, SongbookData } from '../types/songbook';

export const SYSTEM_MAIN_IDS = {
  FAVORITAS: 'fav',
  GRUPO: 'grupo',
  EUCARISTIA: 'eucaristia',
  PIEDRECITAS: 'piedrecitas',
} as const;

export const DEFAULT_MAIN_CATEGORIES: MainCategory[] = [
  {
    id: SYSTEM_MAIN_IDS.FAVORITAS,
    name: 'Favoritas',
    icon: '★',
    system: true,
    subcategories: [],
  },
  {
    id: SYSTEM_MAIN_IDS.GRUPO,
    name: 'Grupo de oración',
    icon: '🙏',
    system: true,
    subcategories: [
      'Animación',
      'Alabanza',
      'Adoración',
      'Presencia',
      'Sanación',
      'Espíritu Santo',
      'Gracia',
      'Danza',
      'Efusión',
      'Cierre oración',
      'Entrega',
    ],
  },
  {
    id: SYSTEM_MAIN_IDS.EUCARISTIA,
    name: 'Eucaristía',
    icon: '✝️',
    system: true,
    subcategories: [
      'Entrada',
      'Penitencial',
      'Gloria',
      'Aclamación',
      'Aleluya',
      'Ofertorio',
      'Santo',
      'Cordero',
      'Comunión',
      'Acción de gracias',
      'Final',
      'María',
    ],
  },
  {
    id: SYSTEM_MAIN_IDS.PIEDRECITAS,
    name: 'Piedrecitas Blancas',
    icon: '🪨',
    system: true,
    subcategories: ['Amigo', 'Hermano', 'Mamá', 'Papá', 'Familia'],
  },
];

const LEGACY_SUBCATEGORY_ALIASES: Record<string, string> = {
  'cierre de oracion': 'Cierre oración',
  'cierre oracion': 'Cierre oración',
  'accion de gracias': 'Acción de gracias',
  'espiritu santo': 'Espíritu Santo',
  animacion: 'Animación',
  adoracion: 'Adoración',
  sanacion: 'Sanación',
  efusion: 'Efusión',
  aclamacion: 'Aclamación',
  comunion: 'Comunión',
  maria: 'María',
  mama: 'Mamá',
  papa: 'Papá',
};

const LEGACY_MAIN_CATEGORY_ALIASES: Record<string, string> = {
  favoritas: SYSTEM_MAIN_IDS.FAVORITAS,
  favorita: SYSTEM_MAIN_IDS.FAVORITAS,
  'grupo de oracion': SYSTEM_MAIN_IDS.GRUPO,
  eucaristia: SYSTEM_MAIN_IDS.EUCARISTIA,
  eucaristica: SYSTEM_MAIN_IDS.EUCARISTIA,
  'piedrecitas blancas': SYSTEM_MAIN_IDS.PIEDRECITAS,
};

export function stripAccentsLower(str: string): string {
  return String(str || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now().toString(36);
}

export function cloneDefaultMainCategories(): MainCategory[] {
  return DEFAULT_MAIN_CATEGORIES.map((m) => ({
    id: m.id,
    name: m.name,
    icon: m.icon,
    system: !!m.system,
    subcategories: [...m.subcategories],
  }));
}

export function normalizeRepertoire(rep: Partial<Repertoire> & { songIds?: string[] }): Repertoire {
  const songsRaw = rep?.songs ?? (rep?.songIds || []).map((id) => ({ id, transpose: 0 }));
  const songs = songsRaw.map((s) =>
    typeof s === 'string'
      ? { id: s, transpose: 0 }
      : { id: String(s.id), transpose: Number(s.transpose) || 0 }
  );
  return {
    id: rep?.id ? String(rep.id) : genId(),
    name: rep?.name ? String(rep.name) : 'Repertorio',
    songs,
    mode: rep?.mode === 'uniform' ? 'uniform' : 'original',
    uniformKey: rep?.uniformKey || 'C',
    pinnedInBar: rep?.pinnedInBar === false ? false : true,
  };
}

export function findSubcategoryCanonical(mainCategories: MainCategory[], rawName: string): string | null {
  const cleaned = String(rawName || '').trim();
  if (!cleaned) return null;
  const norm = stripAccentsLower(cleaned);
  const aliased = LEGACY_SUBCATEGORY_ALIASES[norm];
  if (aliased) return aliased;
  for (const mc of mainCategories) {
    for (const sub of mc.subcategories || []) {
      if (stripAccentsLower(sub) === norm) return sub;
    }
  }
  return cleaned;
}

export function findMainCategoryByIdOrName(mainCategories: MainCategory[], val: string): MainCategory | null {
  if (!val) return null;
  const str = String(val).trim();
  const byId = mainCategories.find((m) => m.id === str);
  if (byId) return byId;
  const norm = stripAccentsLower(str);
  const sysId = LEGACY_MAIN_CATEGORY_ALIASES[norm];
  if (sysId) {
    const sys = mainCategories.find((m) => m.id === sysId);
    if (sys) return sys;
  }
  return mainCategories.find((m) => stripAccentsLower(m.name) === norm) || null;
}

export function syncFlatCategories(data: SongbookData): string[] {
  const seen = new Set<string>();
  const flat: string[] = [];
  (data.mainCategories || []).forEach((mc) => {
    (mc.subcategories || []).forEach((sub) => {
      if (!seen.has(sub)) {
        seen.add(sub);
        flat.push(sub);
      }
    });
  });
  data.categories = flat;
  return flat;
}

export function migrateData(parsedInput: unknown): SongbookData {
  let parsed = parsedInput as Record<string, unknown>;
  if (Array.isArray(parsed)) {
    parsed = { songs: parsed, categories: [] };
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.songs)) {
    throw new Error('Formato inválido');
  }

  let mainCategories: MainCategory[];
  const hasStructuredMain = Array.isArray(parsed.mainCategories) && parsed.mainCategories.length > 0;

  if (hasStructuredMain) {
    mainCategories = [];
    const seenIds = new Set<string>();
    const seenSubNorms = new Set<string>();

    (parsed.mainCategories as Array<Partial<MainCategory>>).forEach((mc) => {
      if (!mc || !mc.name) return;
      const id = String(mc.id || genId());
      if (seenIds.has(id)) return;
      seenIds.add(id);
      const subs: string[] = [];
      (mc.subcategories || []).forEach((rawSub) => {
        const s = String(rawSub || '').trim();
        if (!s) return;
        const n = stripAccentsLower(s);
        if (!seenSubNorms.has(n)) {
          seenSubNorms.add(n);
          subs.push(s);
        }
      });
      mainCategories.push({
        id,
        name: String(mc.name).trim(),
        icon: mc.icon || '📁',
        system: !!mc.system || (Object.values(SYSTEM_MAIN_IDS) as string[]).includes(id),
        subcategories: subs,
      });
    });

    DEFAULT_MAIN_CATEGORIES.forEach((defMc, idx) => {
      if (!mainCategories.some((m) => m.id === defMc.id)) {
        const filteredSubs = defMc.subcategories.filter((s) => {
          const n = stripAccentsLower(s);
          if (seenSubNorms.has(n)) return false;
          seenSubNorms.add(n);
          return true;
        });
        mainCategories.splice(Math.min(idx, mainCategories.length), 0, {
          id: defMc.id,
          name: defMc.name,
          icon: defMc.icon,
          system: true,
          subcategories: filteredSubs,
        });
      }
    });
  } else {
    mainCategories = cloneDefaultMainCategories();
  }

  const knownSubNorms = new Set<string>();
  mainCategories.forEach((mc) => {
    (mc.subcategories || []).forEach((sub) => knownSubNorms.add(stripAccentsLower(sub)));
  });

  const grupoMc = mainCategories.find((m) => m.id === SYSTEM_MAIN_IDS.GRUPO) || mainCategories[0];

  const ensureSubcategoryInTree = (rawCatName: string) => {
    const canonical = findSubcategoryCanonical(mainCategories, rawCatName);
    if (!canonical) return null;
    const mainMatch = findMainCategoryByIdOrName(mainCategories, canonical);
    if (mainMatch) return { isMain: true as const, mainCategory: mainMatch };

    const norm = stripAccentsLower(canonical);
    if (!knownSubNorms.has(norm)) {
      knownSubNorms.add(norm);
      grupoMc.subcategories.push(canonical);
    }
    return { isMain: false as const, subcategory: canonical };
  };

  if (!hasStructuredMain && Array.isArray(parsed.categories)) {
    (parsed.categories as string[]).forEach((cat) => ensureSubcategoryInTree(cat));
  }

  const songs: Song[] = (parsed.songs as Array<Partial<Song>>).map((rawSong) => {
    const s: Song = {
      id: rawSong?.id ? String(rawSong.id) : genId(),
      title: String(rawSong?.title || 'Sin título'),
      key: String(rawSong?.key || ''),
      content: String(rawSong?.content || ''),
      favorite: !!rawSong?.favorite,
      eucaristica: !!rawSong?.eucaristica,
      categories: [],
      mainCategories: [],
      ...(typeof rawSong?.bpm === 'number' ? { bpm: rawSong.bpm } : {}),
    };

    const nextMainCats = new Set<string>();
    if (Array.isArray(rawSong?.mainCategories)) {
      rawSong.mainCategories.forEach((mcRef) => {
        const found = findMainCategoryByIdOrName(mainCategories, mcRef);
        if (found) nextMainCats.add(found.id);
      });
    }
    if (s.eucaristica) nextMainCats.add(SYSTEM_MAIN_IDS.EUCARISTIA);
    if (s.favorite) nextMainCats.add(SYSTEM_MAIN_IDS.FAVORITAS);

    const nextSubs: string[] = [];
    const seenSongSubs = new Set<string>();
    (Array.isArray(rawSong?.categories) ? rawSong.categories : []).forEach((rawCat) => {
      const res = ensureSubcategoryInTree(rawCat);
      if (!res) return;
      if (res.isMain) {
        nextMainCats.add(res.mainCategory.id);
        if (res.mainCategory.id === SYSTEM_MAIN_IDS.EUCARISTIA) s.eucaristica = true;
        if (res.mainCategory.id === SYSTEM_MAIN_IDS.FAVORITAS) s.favorite = true;
      } else if (!seenSongSubs.has(res.subcategory)) {
        seenSongSubs.add(res.subcategory);
        nextSubs.push(res.subcategory);
      }
    });

    s.categories = nextSubs;
    s.mainCategories = Array.from(nextMainCats);
    return s;
  });

  const repertoires = (Array.isArray(parsed.repertoires) ? parsed.repertoires : []).map((r) =>
    normalizeRepertoire(r as Partial<Repertoire>)
  );

  const rawSettings = (parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}) as Record<string, unknown>;
  const settings = {
    theme: rawSettings.theme === 'dark' ? ('dark' as const) : ('light' as const),
    fontSize: typeof rawSettings.fontSize === 'number' ? rawSettings.fontSize : 16,
    logo: typeof rawSettings.logo === 'string' ? rawSettings.logo : null,
    sidebarCollapsed: !!rawSettings.sidebarCollapsed,
    chordNotation: rawSettings.chordNotation === 'latin' ? ('latin' as const) : ('american' as const),
    expandedMainCats: Array.isArray(rawSettings.expandedMainCats) ? (rawSettings.expandedMainCats as string[]) : [],
    repertoiresBarOpen: typeof rawSettings.repertoiresBarOpen === 'boolean' ? rawSettings.repertoiresBarOpen : true,
  };

  const result: SongbookData = {
    songs,
    mainCategories,
    categories: [],
    repertoires,
    settings,
  };
  syncFlatCategories(result);
  return result;
}

export function createDefaultData(): SongbookData {
  const data: SongbookData = {
    songs: [
      {
        id: genId(),
        title: 'Cantad al Señor',
        key: 'Do',
        categories: ['Alabanza', 'Animación'],
        mainCategories: [],
        favorite: false,
        eucaristica: false,
        content:
          'C          G          Am         F\nCantad al Señor un cántico nuevo,\nC          G          F          C\ncantad al Señor, toda la tierra.\n\nAm         F          C          G\nBendecid su nombre, anunciad de día en día\nAm         F          G          C\nsu salvación, su maravilla.',
      },
      {
        id: genId(),
        title: 'Ven Espíritu Santo',
        key: 'Re',
        categories: ['Espíritu Santo', 'Efusión'],
        mainCategories: [SYSTEM_MAIN_IDS.FAVORITAS],
        favorite: true,
        eucaristica: false,
        content:
          'D          A          Bm         G\nVen, ven Espíritu de amor,\nD          A          D\nven a llenar nuestro corazón.\n\nG          D          Em         A\nVen, ven, no tardes más,\nD          A          D\nque te esperamos con ansiedad.',
      },
      {
        id: genId(),
        title: 'Renuévame Señor Jesús',
        key: 'Re',
        categories: ['Sanación', 'Presencia'],
        mainCategories: [],
        favorite: false,
        eucaristica: false,
        content:
          'D          G          A          D\nRenuévame Señor Jesús,\nG          Em         A\nya no quiero ser igual.\n\nD          G          A          Bm\nRenuévame Señor Jesús,\nG          Em         A          D\npon en mí tu corazón.',
      },
      {
        id: genId(),
        title: 'Juntos como hermanos',
        key: 'Sol',
        categories: ['Entrada'],
        mainCategories: [SYSTEM_MAIN_IDS.EUCARISTIA],
        favorite: false,
        eucaristica: true,
        content:
          'G          Em         C          D\nJuntos como hermanos, miembros de una Iglesia,\nG          D          G\nvamos caminando al encuentro del Señor.\n\nG          C          D          G\nUn largo caminar por el desierto bajo el sol,\nEm         Am         D          G\nno podemos avanzar sin la ayuda del Señor.',
      },
      {
        id: genId(),
        title: 'Santo es el Señor',
        key: 'Mi menor',
        categories: ['Santo'],
        mainCategories: [SYSTEM_MAIN_IDS.EUCARISTIA],
        favorite: false,
        eucaristica: true,
        content:
          'Em         D          C          B7\nSanto, Santo, Santo es el Señor,\nEm         D          C          B7\nDios del universo.\n\nAm         D          G          Em\nLlenos están el cielo y la tierra de tu gloria,\nAm         B7         Em\nhosanna en el cielo.',
      },
      {
        id: genId(),
        title: 'Junto a ti María',
        key: 'Re',
        categories: ['María', 'Final'],
        mainCategories: [SYSTEM_MAIN_IDS.EUCARISTIA, SYSTEM_MAIN_IDS.FAVORITAS],
        favorite: true,
        eucaristica: true,
        content:
          'D          A          Bm         F#m\nJunto a ti María, como un niño quiero estar,\nG          D          Em         A\ntómame en tus brazos, guíame en mi caminar.\n\nD          A          Bm         F#m\nQuiero que me eduques, que me enseñes a rezar,\nG          D          A          D\nhazme transparente, lléname de paz.',
      },
    ],
    mainCategories: cloneDefaultMainCategories(),
    categories: [],
    repertoires: [],
    settings: {
      theme: 'light',
      fontSize: 16,
      logo: null,
      sidebarCollapsed: false,
      chordNotation: 'american',
      expandedMainCats: [],
      repertoiresBarOpen: true,
    },
  };
  syncFlatCategories(data);
  return data;
}

export function songMatchesMainCategory(song: Song, mainCat: MainCategory): boolean {
  if (!song || !mainCat) return false;
  if (mainCat.id === SYSTEM_MAIN_IDS.FAVORITAS && song.favorite) return true;
  if (mainCat.id === SYSTEM_MAIN_IDS.EUCARISTIA && song.eucaristica) return true;
  if ((song.mainCategories || []).includes(mainCat.id)) return true;
  const subs = mainCat.subcategories || [];
  return (song.categories || []).some((c) => subs.includes(c));
}

export function songHasAnyCategory(song: Song): boolean {
  return (song.categories || []).length > 0 || (song.mainCategories || []).length > 0 || !!song.eucaristica;
}

export function filterSongs(
  data: SongbookData,
  {
    activeMainCategoryId = null,
    activeSubcategories = [],
    search = '',
    onlyPending = false,
  }: {
    activeMainCategoryId?: string | null;
    activeSubcategories?: string[];
    search?: string;
    onlyPending?: boolean;
  } = {}
): Song[] {
  const q = String(search || '').trim().toLowerCase();
  const mainCat = activeMainCategoryId
    ? (data.mainCategories || []).find((m) => m.id === activeMainCategoryId) || null
    : null;
  const subList = Array.isArray(activeSubcategories) ? activeSubcategories : [];

  return (data.songs || [])
    .filter((s) => {
      if (subList.length > 0) {
        if (!(s.categories || []).some((c) => subList.includes(c))) return false;
      } else if (mainCat) {
        if (!songMatchesMainCategory(s, mainCat)) return false;
      }
      if (onlyPending && songHasAnyCategory(s) && !!s.key) return false;
      if (q) {
        const inTitle = (s.title || '').toLowerCase().includes(q);
        const inContent = (s.content || '').toLowerCase().includes(q);
        const inKey = (s.key || '').toLowerCase().includes(q);
        if (!inTitle && !inContent && !inKey) return false;
      }
      return true;
    })
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es'));
}

export function getSongDisplayCategories(song: Song, mainCategories: MainCategory[]): string[] {
  const labels = [...(song.categories || [])];
  const subParentMap = new Map<string, string>();
  (mainCategories || []).forEach((mc) => {
    (mc.subcategories || []).forEach((sub) => subParentMap.set(sub, mc.id));
  });
  const coveredMainIds = new Set(
    (song.categories || []).map((sub) => subParentMap.get(sub)).filter(Boolean) as string[]
  );
  (song.mainCategories || []).forEach((mcId) => {
    if (mcId === SYSTEM_MAIN_IDS.FAVORITAS || mcId === SYSTEM_MAIN_IDS.EUCARISTIA) return;
    if (coveredMainIds.has(mcId)) return;
    const mc = (mainCategories || []).find((m) => m.id === mcId);
    if (mc && !labels.includes(mc.name)) labels.push(mc.name);
  });
  return labels;
}

export function findParentMainCategoryForSub(
  mainCategories: MainCategory[],
  subName: string | null | undefined
): MainCategory | null {
  if (!subName) return null;
  return (mainCategories || []).find((mc) => (mc.subcategories || []).includes(subName)) || null;
}

export function matchesFilterSets(
  song: Song,
  mainCategories: MainCategory[],
  activeMains: Set<string>,
  activeCats: Set<string>
): boolean {
  const hasMain = activeMains && activeMains.size > 0;
  const hasSub = activeCats && activeCats.size > 0;
  if (!hasMain && !hasSub) return true;
  const subMatch = hasSub && (song.categories || []).some((c) => activeCats.has(c));
  const mainMatch =
    hasMain && (mainCategories || []).some((mc) => activeMains.has(mc.id) && songMatchesMainCategory(song, mc));
  return subMatch || mainMatch;
}

export function addMainCategoryToData(
  data: SongbookData,
  name: string,
  icon = '📁'
): { ok: true; mainCategory: MainCategory } | { ok: false; error: string } {
  const cleaned = String(name || '').trim();
  if (!cleaned) return { ok: false, error: 'Ingresa un nombre para la categoría principal.' };
  const norm = stripAccentsLower(cleaned);
  const dup = (data.mainCategories || []).find((m) => stripAccentsLower(m.name) === norm);
  if (dup) return { ok: false, error: `La categoría principal "${dup.name}" ya existe.` };
  const newMc: MainCategory = {
    id: 'mc-' + genId(),
    name: cleaned,
    icon: icon || '📁',
    system: false,
    subcategories: [],
  };
  data.mainCategories.push(newMc);
  syncFlatCategories(data);
  return { ok: true, mainCategory: newMc };
}

export function addSubcategoryToData(
  data: SongbookData,
  parentId: string,
  subName: string
): { ok: true; parent: MainCategory; subcategory: string } | { ok: false; error: string } {
  const cleaned = String(subName || '').trim();
  if (!cleaned) return { ok: false, error: 'Ingresa un nombre para la subcategoría.' };
  const parent = (data.mainCategories || []).find((m) => m.id === parentId);
  if (!parent) return { ok: false, error: 'Elige una categoría superior válida.' };

  const norm = stripAccentsLower(cleaned);
  for (const mc of data.mainCategories) {
    const existing = (mc.subcategories || []).find((s) => stripAccentsLower(s) === norm);
    if (existing) {
      return { ok: false, error: `La subcategoría "${existing}" ya existe en "${mc.name}".` };
    }
  }
  parent.subcategories.push(cleaned);
  syncFlatCategories(data);
  return { ok: true, parent, subcategory: cleaned };
}

export function renameMainCategoryInData(
  data: SongbookData,
  mainId: string,
  newName: string
): { ok: true } | { ok: false; error: string } {
  const cleaned = String(newName || '').trim();
  if (!cleaned) return { ok: false, error: 'El nombre no puede quedar vacío.' };
  const mc = (data.mainCategories || []).find((m) => m.id === mainId);
  if (!mc) return { ok: false, error: 'Categoría no encontrada.' };
  const norm = stripAccentsLower(cleaned);
  const dup = (data.mainCategories || []).find((m) => m.id !== mainId && stripAccentsLower(m.name) === norm);
  if (dup) return { ok: false, error: `Ya existe una categoría llamada "${dup.name}".` };
  mc.name = cleaned;
  return { ok: true };
}

export function deleteMainCategoryFromData(
  data: SongbookData,
  mainId: string
): { ok: true } | { ok: false; error: string } {
  const mc = (data.mainCategories || []).find((m) => m.id === mainId);
  if (!mc) return { ok: false, error: 'Categoría no encontrada.' };
  if (mc.system) return { ok: false, error: 'Las categorías base del sistema no se pueden eliminar.' };
  const subsToRemove = new Set(mc.subcategories || []);
  (data.songs || []).forEach((s) => {
    s.mainCategories = (s.mainCategories || []).filter((id) => id !== mainId);
    if (subsToRemove.size > 0) {
      s.categories = (s.categories || []).filter((c) => !subsToRemove.has(c));
    }
  });
  data.mainCategories = data.mainCategories.filter((m) => m.id !== mainId);
  syncFlatCategories(data);
  return { ok: true };
}

export function renameSubcategoryInData(
  data: SongbookData,
  parentId: string,
  oldName: string,
  newName: string
): { ok: true } | { ok: false; error: string } {
  const cleaned = String(newName || '').trim();
  if (!cleaned) return { ok: false, error: 'El nombre no puede quedar vacío.' };
  const parent = (data.mainCategories || []).find((m) => m.id === parentId);
  if (!parent) return { ok: false, error: 'Categoría superior no encontrada.' };
  const idx = (parent.subcategories || []).indexOf(oldName);
  if (idx === -1) return { ok: false, error: 'Subcategoría no encontrada.' };

  const norm = stripAccentsLower(cleaned);
  for (const mc of data.mainCategories) {
    const conflict = (mc.subcategories || []).find((s) => s !== oldName && stripAccentsLower(s) === norm);
    if (conflict) {
      return { ok: false, error: `Ya existe una subcategoría "${conflict}" en "${mc.name}".` };
    }
  }
  parent.subcategories[idx] = cleaned;
  (data.songs || []).forEach((s) => {
    s.categories = (s.categories || []).map((c) => (c === oldName ? cleaned : c));
  });
  syncFlatCategories(data);
  return { ok: true };
}

export function moveSubcategoryInData(
  data: SongbookData,
  fromParentId: string,
  toParentId: string,
  subName: string
): { ok: true } | { ok: false; error: string } {
  if (fromParentId === toParentId) return { ok: true };
  const fromParent = (data.mainCategories || []).find((m) => m.id === fromParentId);
  const toParent = (data.mainCategories || []).find((m) => m.id === toParentId);
  if (!fromParent || !toParent) return { ok: false, error: 'Categoría superior no encontrada.' };
  if (!(fromParent.subcategories || []).includes(subName)) return { ok: false, error: 'Subcategoría no encontrada.' };
  fromParent.subcategories = fromParent.subcategories.filter((s) => s !== subName);
  if (!toParent.subcategories.includes(subName)) toParent.subcategories.push(subName);
  syncFlatCategories(data);
  return { ok: true };
}

export function deleteSubcategoryFromData(
  data: SongbookData,
  parentId: string,
  subName: string
): { ok: true } | { ok: false; error: string } {
  const parent = (data.mainCategories || []).find((m) => m.id === parentId);
  if (!parent) return { ok: false, error: 'Categoría superior no encontrada.' };
  parent.subcategories = (parent.subcategories || []).filter((s) => s !== subName);
  (data.songs || []).forEach((s) => {
    s.categories = (s.categories || []).filter((c) => c !== subName);
  });
  syncFlatCategories(data);
  return { ok: true };
}

export function moveRepertoireInData(
  data: SongbookData,
  repId: string,
  delta: number
): { ok: true } | { ok: false; error: string } {
  const reps = data?.repertoires;
  if (!Array.isArray(reps)) return { ok: false, error: 'Sin repertorios.' };
  const idx = reps.findIndex((r) => r.id === repId);
  if (idx === -1) return { ok: false, error: 'Repertorio no encontrado.' };
  const target = idx + delta;
  if (target < 0 || target >= reps.length) return { ok: false, error: 'Límite alcanzado.' };
  const [item] = reps.splice(idx, 1);
  reps.splice(target, 0, item);
  return { ok: true };
}

export function setRepertoirePinnedInData(
  data: SongbookData,
  repId: string,
  pinned: boolean
): { ok: boolean } {
  const reps = data?.repertoires;
  if (!Array.isArray(reps)) return { ok: false };
  const rep = reps.find((r) => r.id === repId);
  if (!rep) return { ok: false };
  rep.pinnedInBar = !!pinned;
  return { ok: true };
}

export function getVisibleRepertoires(data: SongbookData): Repertoire[] {
  return (data?.repertoires || []).filter((r) => r && r.pinnedInBar !== false);
}
