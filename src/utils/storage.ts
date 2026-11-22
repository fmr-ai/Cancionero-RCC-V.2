import type { SongbookData } from '../types/songbook';
import { createDefaultData, migrateData, syncFlatCategories } from './categories';

export const STORAGE_KEY = 'cancionero_rcc_arica_v4';
export const DEFAULT_LOGO_URL = '/logo-rcc-arica.png';

export function loadSongbook(): SongbookData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return migrateData(JSON.parse(raw));
    }
  } catch (e) {
    console.warn('No se pudieron cargar los datos guardados, usando biblioteca inicial.', e);
  }
  return createDefaultData();
}

export function saveSongbook(data: SongbookData): void {
  try {
    syncFlatCategories(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage.', e);
  }
}
