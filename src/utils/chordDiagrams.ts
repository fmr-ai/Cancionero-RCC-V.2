import { CHORD_TOKEN_RE, NOTES_SHARP, normalizeNote } from './chords';

export type FretValue = number | 'x';

export interface ChordShape {
  frets: [FretValue, FretValue, FretValue, FretValue, FretValue, FretValue];
  baseFret: number;
  barre: boolean;
  approx: boolean;
}

export interface ChordDiagramData {
  root: string;
  quality: string;
  shape: ChordShape;
  pianoNotes: number[]; // pitch classes 0..11 relative to C=0
}

const OPEN_CHORD_SHAPES: Record<string, { frets: ChordShape['frets']; barre: boolean }> = {
  C: { frets: ['x', 3, 2, 0, 1, 0], barre: false },
  C7: { frets: ['x', 3, 2, 3, 1, 0], barre: false },
  Cmaj7: { frets: ['x', 3, 2, 0, 0, 0], barre: false },
  Cadd9: { frets: ['x', 3, 2, 0, 3, 0], barre: false },
  D: { frets: ['x', 'x', 0, 2, 3, 2], barre: false },
  Dm: { frets: ['x', 'x', 0, 2, 3, 1], barre: false },
  D7: { frets: ['x', 'x', 0, 2, 1, 2], barre: false },
  Dmaj7: { frets: ['x', 'x', 0, 2, 2, 2], barre: false },
  Dm7: { frets: ['x', 'x', 0, 2, 1, 1], barre: false },
  Dsus4: { frets: ['x', 'x', 0, 2, 3, 3], barre: false },
  Dsus2: { frets: ['x', 'x', 0, 2, 3, 0], barre: false },
  E: { frets: [0, 2, 2, 1, 0, 0], barre: false },
  Em: { frets: [0, 2, 2, 0, 0, 0], barre: false },
  E7: { frets: [0, 2, 0, 1, 0, 0], barre: false },
  Emaj7: { frets: [0, 2, 1, 1, 0, 0], barre: false },
  Em7: { frets: [0, 2, 0, 0, 0, 0], barre: false },
  Esus4: { frets: [0, 2, 2, 2, 0, 0], barre: false },
  F: { frets: [1, 3, 3, 2, 1, 1], barre: true },
  Fm: { frets: [1, 3, 3, 1, 1, 1], barre: true },
  Fmaj7: { frets: ['x', 'x', 3, 2, 1, 0], barre: false },
  G: { frets: [3, 2, 0, 0, 0, 3], barre: false },
  G7: { frets: [3, 2, 0, 0, 0, 1], barre: false },
  Gmaj7: { frets: [3, 2, 0, 0, 0, 2], barre: false },
  G6: { frets: [3, 2, 0, 0, 0, 0], barre: false },
  A: { frets: ['x', 0, 2, 2, 2, 0], barre: false },
  Am: { frets: ['x', 0, 2, 2, 1, 0], barre: false },
  A7: { frets: ['x', 0, 2, 0, 2, 0], barre: false },
  Amaj7: { frets: ['x', 0, 2, 1, 2, 0], barre: false },
  Am7: { frets: ['x', 0, 2, 0, 1, 0], barre: false },
  Asus4: { frets: ['x', 0, 2, 2, 3, 0], barre: false },
  Asus2: { frets: ['x', 0, 2, 2, 0, 0], barre: false },
  B: { frets: ['x', 2, 4, 4, 4, 2], barre: true },
  Bm: { frets: ['x', 2, 4, 4, 3, 2], barre: true },
  B7: { frets: ['x', 2, 1, 2, 0, 2], barre: false },
  Bm7: { frets: ['x', 2, 4, 2, 3, 2], barre: true },
};

function normalizeQualityForChord(rawQuality: string): { bucket: string; suffix: string; approx: boolean } {
  const q = (rawQuality || '').toLowerCase();
  if (q === '') return { bucket: 'major', suffix: '', approx: false };
  if (q === 'm') return { bucket: 'minor', suffix: 'm', approx: false };
  if (q === '7') return { bucket: 'dom7', suffix: '7', approx: false };
  if (q === 'maj7') return { bucket: 'maj7', suffix: 'maj7', approx: false };
  if (q === 'maj') return { bucket: 'major', suffix: '', approx: false };
  if (q === 'm7') return { bucket: 'm7', suffix: 'm7', approx: false };
  if (q === 'sus4') return { bucket: 'sus4', suffix: 'sus4', approx: false };
  if (q === 'sus2') return { bucket: 'sus2', suffix: 'sus2', approx: false };
  if (q === 'add9') return { bucket: 'major', suffix: 'add9', approx: false };
  if (q === '6') return { bucket: 'major', suffix: '6', approx: false };
  if (q.startsWith('m')) return { bucket: 'minor', suffix: 'm', approx: true };
  return { bucket: 'major', suffix: '', approx: true };
}

export function computeChordShape(root: string, rawQuality: string): ChordShape {
  const { bucket, suffix, approx } = normalizeQualityForChord(rawQuality);
  const key = root + suffix;
  if (OPEN_CHORD_SHAPES[key]) {
    return { ...OPEN_CHORD_SHAPES[key], baseFret: 0, approx };
  }

  const E_TEMPLATES: Record<string, ChordShape['frets']> = {
    major: [0, 2, 2, 1, 0, 0],
    minor: [0, 2, 2, 0, 0, 0],
    dom7: [0, 2, 0, 1, 0, 0],
    maj7: [0, 2, 1, 1, 0, 0],
    m7: [0, 2, 0, 0, 0, 0],
    sus4: [0, 2, 2, 2, 0, 0],
    sus2: [0, 2, 4, 4, 0, 0],
  };

  const A_TEMPLATES: Record<string, ChordShape['frets']> = {
    major: ['x', 0, 2, 2, 2, 0],
    minor: ['x', 0, 2, 2, 1, 0],
    dom7: ['x', 0, 2, 0, 2, 0],
    maj7: ['x', 0, 2, 1, 2, 0],
    m7: ['x', 0, 2, 0, 1, 0],
    sus4: ['x', 0, 2, 2, 3, 0],
    sus2: ['x', 0, 2, 2, 0, 0],
  };

  const rootIdx = NOTES_SHARP.indexOf(root as (typeof NOTES_SHARP)[number]);
  const eOffset = ((rootIdx - NOTES_SHARP.indexOf('E')) % 12 + 12) % 12;
  const aOffset = ((rootIdx - NOTES_SHARP.indexOf('A')) % 12 + 12) % 12;

  // Prefer the lower fret position between E-shape and A-shape
  const useAShape = aOffset > 0 && aOffset <= 6 && (eOffset === 0 || aOffset < eOffset);
  const barreFret = useAShape ? aOffset : eOffset;
  const template = (useAShape ? A_TEMPLATES : E_TEMPLATES)[bucket] || (useAShape ? A_TEMPLATES.major : E_TEMPLATES.major);

  if (barreFret === 0) {
    return { frets: template, baseFret: 0, barre: false, approx };
  }
  const frets = template.map((v) => (typeof v === 'number' ? v + barreFret : v)) as ChordShape['frets'];
  return { frets, baseFret: barreFret, barre: true, approx };
}

export function getPianoNotesForChord(root: string, rawQuality: string): number[] {
  const rootIdx = NOTES_SHARP.indexOf(root as (typeof NOTES_SHARP)[number]);
  if (rootIdx === -1) return [];
  const q = (rawQuality || '').toLowerCase();
  let intervals = [0, 4, 7];
  if (q === 'm' || q === 'min') intervals = [0, 3, 7];
  else if (q === '7') intervals = [0, 4, 7, 10];
  else if (q === 'maj7') intervals = [0, 4, 7, 11];
  else if (q === 'm7' || q === 'min7') intervals = [0, 3, 7, 10];
  else if (q === 'sus4') intervals = [0, 5, 7];
  else if (q === 'sus2') intervals = [0, 2, 7];
  else if (q === 'add9') intervals = [0, 4, 7, 14];
  else if (q === 'dim') intervals = [0, 3, 6];
  else if (q === 'aug' || q === '+') intervals = [0, 4, 8];
  else if (q === '6') intervals = [0, 4, 7, 9];
  else if (q.startsWith('m')) intervals = [0, 3, 7];
  return intervals.map((i) => (rootIdx + i) % 12);
}

export function getChordDiagramData(chordToken: string): ChordDiagramData | null {
  const base = chordToken.split('/')[0];
  const m = base.match(CHORD_TOKEN_RE);
  if (!m) return null;
  const [, rootRaw, quality = ''] = m;
  const root = normalizeNote(rootRaw);
  const shape = computeChordShape(root, quality);
  const pianoNotes = getPianoNotesForChord(root, quality);
  return { root, quality, shape, pianoNotes };
}
