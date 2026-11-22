export type ChordNotation = 'american' | 'latin';
export type ThemeMode = 'light' | 'dark';
export type RepertoireMode = 'original' | 'uniform';
export type PaperSize = 'a4' | 'letter' | 'legal';

export interface Song {
  id: string;
  title: string;
  key: string;
  categories: string[];
  mainCategories: string[];
  favorite: boolean;
  eucaristica: boolean;
  content: string;
  bpm?: number;
}

export interface MainCategory {
  id: string;
  name: string;
  icon: string;
  system: boolean;
  subcategories: string[];
}

export interface RepertoireEntry {
  id: string;
  transpose: number;
}

export interface Repertoire {
  id: string;
  name: string;
  songs: RepertoireEntry[];
  mode: RepertoireMode;
  uniformKey: string;
  pinnedInBar: boolean;
}

export interface SongbookSettings {
  theme: ThemeMode;
  fontSize: number;
  logo: string | null;
  sidebarCollapsed: boolean;
  chordNotation: ChordNotation;
  expandedMainCats: string[];
  repertoiresBarOpen: boolean;
}

export interface SongbookData {
  songs: Song[];
  mainCategories: MainCategory[];
  categories: string[];
  repertoires: Repertoire[];
  settings: SongbookSettings;
}

export interface KeyLockState {
  active: boolean;
  root: string | null;
  fallbackTranspose: number;
}

export interface PrintOptions {
  mode: 'repertoire' | 'individual';
  repertoireId: string | null;
  selectedSongIds: string[];
  title: string;
  date: string;
  paperSize: PaperSize;
  columns: 1 | 2 | 3;
  songsPerPage: number;
  fontSize: number;
  includeChords: boolean;
  includeIndex: boolean;
}

export interface ChordTokenPart {
  type: 'space' | 'chord';
  text: string;
  american?: string;
  display?: string;
}

export interface ParsedSongLine {
  kind: 'empty' | 'chords' | 'lyric';
  text: string;
  parts?: ChordTokenPart[];
}
