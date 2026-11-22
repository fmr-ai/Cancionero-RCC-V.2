import type { ChordNotation, KeyLockState, ParsedSongLine, Song } from '../types/songbook';

export const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

export const CHORD_TOKEN_RE = /^([A-G](?:#|b)?)((?:maj|min|sus|dim|aug|add|m)?\d{0,2}\+?)(?:\/([A-G](?:#|b)?))?$/i;
export const LATIN_CHORD_TOKEN_RE = /^(do|re|mi|fa|sol|la|si)(#|b)?((?:maj|min|sus|dim|aug|add|m)?\d{0,2}\+?)?(?:\/(do|re|mi|fa|sol|la|si)(#|b)?)?$/i;

export const AMERICAN_TO_LATIN: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
};

const LATIN_TO_AMERICAN: Record<string, string> = {
  do: 'C',
  re: 'D',
  mi: 'E',
  fa: 'F',
  sol: 'G',
  la: 'A',
  si: 'B',
};

export const OPEN_EASY_KEYS = new Set(['C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm']);

export function normalizeNote(n: string): string {
  const clean = n[0].toUpperCase() + n.slice(1);
  return FLAT_TO_SHARP[clean] || clean;
}

export function shiftNote(note: string, semitones: number): string {
  const norm = normalizeNote(note);
  const idx = NOTES_SHARP.indexOf(norm as (typeof NOTES_SHARP)[number]);
  if (idx === -1) return note;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return NOTES_SHARP[newIdx];
}

export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => CHORD_TOKEN_RE.test(t));
}

export function isLatinChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => LATIN_CHORD_TOKEN_RE.test(t));
}

export function transposeChordToken(tok: string, semitones: number): string {
  if (semitones === 0) return tok;
  const m = tok.match(CHORD_TOKEN_RE);
  if (!m) return tok;
  const [, root, quality, bass] = m;
  let out = shiftNote(root, semitones) + (quality || '');
  if (bass) out += '/' + shiftNote(bass, semitones);
  return out;
}

export function transposeChordLine(line: string, semitones: number): string {
  if (semitones === 0) return line;
  return line.replace(/\S+/g, (tok) => transposeChordToken(tok, semitones));
}

export function chordTokenToLatin(tok: string): string {
  const m = tok.match(CHORD_TOKEN_RE);
  if (!m) return tok;
  const [, root, quality, bass] = m;
  const rootLetter = root[0].toUpperCase();
  const rootAcc = root.slice(1);
  let out = (AMERICAN_TO_LATIN[rootLetter] || rootLetter) + rootAcc + (quality || '');
  if (bass) {
    const bassLetter = bass[0].toUpperCase();
    const bassAcc = bass.slice(1);
    out += '/' + (AMERICAN_TO_LATIN[bassLetter] || bassLetter) + bassAcc;
  }
  return out;
}

export function latinTokenToAmerican(tok: string): string {
  const m = tok.match(LATIN_CHORD_TOKEN_RE);
  if (!m) return tok;
  const [, rootWord, rootAcc = '', quality = '', bassWord, bassAcc = ''] = m;
  const amRoot = (LATIN_TO_AMERICAN[rootWord.toLowerCase()] || rootWord) + rootAcc;
  let out = amRoot + quality;
  if (bassWord) {
    const amBass = (LATIN_TO_AMERICAN[bassWord.toLowerCase()] || bassWord) + bassAcc;
    out += '/' + amBass;
  }
  return out;
}

/**
 * Converts lines consisting solely of Latin chord tokens (e.g., "Do Sol Lam Fa")
 * to American notation ("C G Am F"), leaving lyric lines untouched.
 */
export function convertLatinChordLinesToAmerican(content: string): { content: string; convertedLines: number } {
  let convertedLines = 0;
  const next = String(content || '')
    .split('\n')
    .map((line) => {
      if (isLatinChordLine(line)) {
        convertedLines++;
        return line.replace(/\S+/g, (tok) => latinTokenToAmerican(tok));
      }
      return line;
    })
    .join('\n');
  return { content: next, convertedLines };
}

export function parseKeyNameToRoot(keyStr: string): string | null {
  const cleaned = String(keyStr || '').trim();
  if (!cleaned) return null;
  const mLat = cleaned.match(/^(sol|do|re|mi|fa|la|si)\s*(#|b|sostenido|bemol)?/i);
  if (mLat) {
    const base = LATIN_TO_AMERICAN[mLat[1].toLowerCase()];
    const accRaw = (mLat[2] || '').toLowerCase();
    const acc = accRaw === '#' || accRaw === 'sostenido' ? '#' : accRaw === 'b' || accRaw === 'bemol' ? 'b' : '';
    return normalizeNote(base + acc);
  }
  const mAm = cleaned.match(/^([A-G])(#|b)?/i);
  if (mAm) {
    return normalizeNote(mAm[1].toUpperCase() + (mAm[2] || ''));
  }
  return null;
}

export function detectOriginalRoot(song: Pick<Song, 'content' | 'key'> | null | undefined): string | null {
  if (!song) return null;
  if (song.content) {
    const lines = song.content.split('\n');
    for (const line of lines) {
      if (isChordLine(line)) {
        const tokens = line.trim().split(/\s+/).filter(Boolean);
        const m = tokens[0].match(CHORD_TOKEN_RE);
        if (m) return normalizeNote(m[1]);
      }
    }
  }
  return parseKeyNameToRoot(song.key);
}

export function formatRootForDisplay(americanRoot: string | null | undefined, chordNotation: ChordNotation): string {
  if (!americanRoot) return '';
  if (chordNotation === 'latin') {
    const letter = americanRoot[0].toUpperCase();
    const acc = americanRoot.slice(1);
    return (AMERICAN_TO_LATIN[letter] || letter) + acc;
  }
  return americanRoot;
}

export function shortestOffset(from: string, to: string): number {
  const iFrom = NOTES_SHARP.indexOf(normalizeNote(from) as (typeof NOTES_SHARP)[number]);
  const iTo = NOTES_SHARP.indexOf(normalizeNote(to) as (typeof NOTES_SHARP)[number]);
  if (iFrom === -1 || iTo === -1) return 0;
  let off = ((iTo - iFrom) % 12 + 12) % 12;
  if (off > 6) off -= 12;
  return off;
}

export function computeSongTransposeForKeyLock(song: Song, keyLock: KeyLockState): number {
  if (!keyLock || !keyLock.active) return 0;
  const orig = detectOriginalRoot(song);
  if (orig && keyLock.root) return shortestOffset(orig, keyLock.root);
  return keyLock.fallbackTranspose || 0;
}

export function suggestSongKey(song: Pick<Song, 'content'>): { key: string; sure: boolean } | null {
  const toks: string[] = [];
  (song.content || '').split('\n').forEach((l) => {
    if (isChordLine(l)) {
      const t = l.trim().split(/\s+/).filter(Boolean);
      if (t.length) {
        toks.push(t[0], t[t.length - 1]);
      }
    }
  });
  if (!toks.length) return null;
  const parse = (tok: string) => {
    const m = tok.match(CHORD_TOKEN_RE);
    if (!m) return null;
    return {
      root: m[1][0].toUpperCase() + m[1].slice(1),
      minor: /^m(?!aj)/.test(m[2] || ''),
    };
  };
  const a = parse(toks[0]);
  const b = parse(toks[toks.length - 1]);
  if (!a) return null;
  const key = (AMERICAN_TO_LATIN[a.root[0]] || a.root[0]) + a.root.slice(1) + (a.minor ? ' menor' : '');
  return { key, sure: !!b && b.root === a.root && b.minor === a.minor };
}

export interface UniqueChordInfo {
  american: string;
  display: string;
}

export function extractUniqueChords(
  content: string,
  semitones: number,
  chordNotation: ChordNotation = 'american'
): UniqueChordInfo[] {
  const seen = new Set<string>();
  const list: UniqueChordInfo[] = [];
  String(content || '')
    .split('\n')
    .forEach((line) => {
      if (!isChordLine(line)) return;
      const tokens = line.trim().split(/\s+/).filter(Boolean);
      tokens.forEach((tok) => {
        const american = transposeChordToken(tok, semitones);
        if (!seen.has(american)) {
          seen.add(american);
          const display = chordNotation === 'latin' ? chordTokenToLatin(american) : american;
          list.push({ american, display });
        }
      });
    });
  return list;
}

export interface CapoSuggestion {
  fret: number;
  shapeKey: string;
  openCount: number;
  totalChords: number;
}

/**
 * Given the current sounding chords of a song, finds the best capo frets (1..7)
 * that maximize easy open guitar chord shapes (C, G, D, A, E, Am, Em, Dm).
 */
export function suggestCapoPositions(
  soundingChords: string[],
  chordNotation: ChordNotation = 'american'
): CapoSuggestion[] {
  if (!soundingChords.length) return [];
  const results: CapoSuggestion[] = [];

  for (let fret = 1; fret <= 7; fret++) {
    let openCount = 0;
    let firstShapeKey = '';

    soundingChords.forEach((ch, idx) => {
      const shapeTok = transposeChordToken(ch, -fret);
      const base = shapeTok.split('/')[0];
      const m = base.match(CHORD_TOKEN_RE);
      if (m) {
        const root = normalizeNote(m[1]);
        const q = (m[2] || '').toLowerCase();
        const isMinor = q === 'm' || q === 'm7' || q.startsWith('min');
        const simple = root + (isMinor ? 'm' : '');
        if (idx === 0) {
          firstShapeKey = formatRootForDisplay(root, chordNotation) + (isMinor ? 'm' : '');
        }
        if (OPEN_EASY_KEYS.has(simple)) {
          openCount++;
        }
      }
    });

    if (openCount > 0) {
      results.push({
        fret,
        shapeKey: firstShapeKey,
        openCount,
        totalChords: soundingChords.length,
      });
    }
  }

  return results
    .sort((a, b) => b.openCount - a.openCount || a.fret - b.fret)
    .slice(0, 3);
}

export function parseSongContentLines(
  content: string,
  semitones: number,
  chordNotation: ChordNotation
): ParsedSongLine[] {
  return String(content || '')
    .split('\n')
    .map((line) => {
      if (line.trim() === '') {
        return { kind: 'empty', text: '' };
      }
      if (isChordLine(line)) {
        const parts: ParsedSongLine['parts'] = [];
        const regex = /(\s+|\S+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          const chunk = match[0];
          if (/^\s+$/.test(chunk)) {
            parts.push({ type: 'space', text: chunk });
          } else {
            const american = transposeChordToken(chunk, semitones);
            const display = chordNotation === 'latin' ? chordTokenToLatin(american) : american;
            parts.push({
              type: 'chord',
              text: chunk,
              american,
              display,
            });
          }
        }
        return { kind: 'chords', text: line, parts };
      }
      return { kind: 'lyric', text: line };
    });
}
