import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chordTokenToLatin,
  computeSongTransposeForKeyLock,
  convertLatinChordLinesToAmerican,
  detectOriginalRoot,
  extractUniqueChords,
  isChordLine,
  isLatinChordLine,
  parseSongContentLines,
  shortestOffset,
  suggestCapoPositions,
  suggestSongKey,
  transposeChordLine,
} from './chords';
import { getChordDiagramData } from './chordDiagrams';
import type { Song } from '../types/songbook';

test('isChordLine recognizes American chords and rejects lyrics', () => {
  assert.equal(isChordLine('C   G   Am   F'), true);
  assert.equal(isChordLine('D/F#   Bm7   Asus4'), true);
  assert.equal(isChordLine('Cantad al Señor un cántico nuevo'), false);
  assert.equal(isChordLine('   '), false);
});

test('transposeChordLine transposes roots and slash bass notes', () => {
  assert.equal(transposeChordLine('C   G/B   Am   F', 2), 'D   A/C#   Bm   G');
  assert.equal(transposeChordLine('Em  D  C  B7', -2), 'Dm  C  A#  A7');
});

test('chordTokenToLatin formats American chords to Spanish solfege', () => {
  assert.equal(chordTokenToLatin('C'), 'Do');
  assert.equal(chordTokenToLatin('Am7'), 'Lam7');
  assert.equal(chordTokenToLatin('G/B'), 'Sol/Si');
  assert.equal(chordTokenToLatin('F#m'), 'Fa#m');
});

test('convertLatinChordLinesToAmerican converts Latin chord lines only', () => {
  const input = 'Do    Sol   Lam   Fa\nCantad al Señor un nuevo canto\nRe7   Sol';
  assert.equal(isLatinChordLine('Do    Sol   Lam   Fa'), true);
  assert.equal(isLatinChordLine('Cantad al Señor un nuevo canto'), false);
  const { content, convertedLines } = convertLatinChordLinesToAmerican(input);
  assert.equal(convertedLines, 2);
  assert.equal(content, 'C    G   Am   F\nCantad al Señor un nuevo canto\nD7   G');
});

test('detectOriginalRoot and computeSongTransposeForKeyLock work across songs', () => {
  const song: Song = {
    id: 's1',
    title: 'Test',
    key: 'Re',
    categories: [],
    mainCategories: [],
    favorite: false,
    eucaristica: false,
    content: 'D  A  Bm  G\nLetra',
  };
  assert.equal(detectOriginalRoot(song), 'D');
  assert.equal(shortestOffset('D', 'C'), -2);
  assert.equal(
    computeSongTransposeForKeyLock(song, { active: true, root: 'C', fallbackTranspose: 0 }),
    -2
  );
});

test('extractUniqueChords and suggestCapoPositions provide useful guitar helpers', () => {
  const content = 'A   E   F#m   D\nAlabanza al Señor';
  const chords = extractUniqueChords(content, 0, 'american');
  assert.deepEqual(
    chords.map((c) => c.american),
    ['A', 'E', 'F#m', 'D']
  );
  const capoSuggestions = suggestCapoPositions(
    chords.map((c) => c.american),
    'american'
  );
  assert.ok(capoSuggestions.length > 0);
  // Capo 2 turns A, E, F#m, D into G, D, Em, C (all 4 open!)
  assert.equal(capoSuggestions[0].fret, 2);
  assert.equal(capoSuggestions[0].openCount, 4);
  assert.equal(capoSuggestions[0].shapeKey, 'G');
});

test('suggestSongKey detects sure key when first and last chords match', () => {
  assert.deepEqual(suggestSongKey({ content: 'Em  C  G  D\nSanto\nC  D  Em' }), {
    key: 'Mi menor',
    sure: true,
  });
});

test('parseSongContentLines splits chord and lyric lines cleanly', () => {
  const lines = parseSongContentLines('C   G\nHola\n\nAm', 2, 'latin');
  assert.equal(lines.length, 4);
  assert.equal(lines[0].kind, 'chords');
  assert.equal(lines[0].parts?.filter((p) => p.type === 'chord').map((p) => p.display).join(','), 'Re,La');
  assert.equal(lines[1].kind, 'lyric');
  assert.equal(lines[2].kind, 'empty');
});

test('getChordDiagramData computes open and movable A/E barre shapes', () => {
  const c = getChordDiagramData('C');
  assert.ok(c);
  assert.equal(c.shape.barre, false);
  const fSharpMinor = getChordDiagramData('F#m');
  assert.ok(fSharpMinor);
  assert.equal(fSharpMinor.shape.barre, true);
  assert.equal(fSharpMinor.shape.baseFret, 2);
});
