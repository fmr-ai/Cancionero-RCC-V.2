import type { ChordNotation, MainCategory, PrintOptions, Song } from '../types/songbook';
import { getSongDisplayCategories } from './categories';
import { chordTokenToLatin, detectOriginalRoot, formatRootForDisplay, isChordLine, shiftNote, transposeChordLine } from './chords';

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

export function formatPrintDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const mi = parseInt(m, 10) - 1;
  if (!months[mi]) return dateStr;
  return `${parseInt(d, 10)} de ${months[mi]} de ${y}`;
}

function buildPrintSongContent(
  content: string,
  semitones: number,
  includeChords: boolean,
  chordNotation: ChordNotation
): string {
  return String(content || '')
    .split('\n')
    .map((line) => {
      if (line.trim() === '') return '<div class="lyric-line">&nbsp;</div>';
      if (isChordLine(line)) {
        if (!includeChords) return null;
        let t = transposeChordLine(line, semitones || 0);
        if (chordNotation === 'latin') {
          t = t.replace(/\S+/g, (m) => chordTokenToLatin(m));
        }
        return `<div class="chord-line">${escapeHtml(t)}</div>`;
      }
      return `<div class="lyric-line">${escapeHtml(line)}</div>`;
    })
    .filter((x) => x !== null)
    .join('');
}

export interface PrintableSongItem {
  song: Song;
  transpose: number;
}

export function buildPrintableHTML(
  list: PrintableSongItem[],
  opts: PrintOptions,
  mainCategories: MainCategory[],
  chordNotation: ChordNotation
): string {
  const perPage = Math.max(1, opts.songsPerPage || 4);
  const pages: PrintableSongItem[][] = [];
  for (let i = 0; i < list.length; i += perPage) {
    pages.push(list.slice(i, i + perPage));
  }
  const pageSizeMap: Record<string, string> = { a4: 'A4', letter: 'letter', legal: 'legal' };

  const indexHtml =
    opts.includeIndex && list.length > 0
      ? `<div class="doc-index">
          <strong>Índice de cantos:</strong>
          ${list.map(({ song }, i) => `<span>${i + 1}. ${escapeHtml(song.title)}</span>`).join(' · ')}
        </div>`
      : '';

  let globalIdx = 0;
  const pagesHtml = pages
    .map(
      (pageSongs) => `
    <div class="page">
      ${pageSongs
        .map(({ song, transpose }) => {
          globalIdx++;
          const cats = getSongDisplayCategories(song, mainCategories);
          const origRoot = detectOriginalRoot(song);
          const effRoot = origRoot ? shiftNote(origRoot, transpose) : null;
          const effDisplay = effRoot ? formatRootForDisplay(effRoot, chordNotation) : '';
          const toneMeta = song.key
            ? `Tono: ${escapeHtml(song.key)}${transpose && effDisplay ? ` → ${escapeHtml(effDisplay)}` : ''}`
            : effDisplay
            ? `Tono: ${escapeHtml(effDisplay)}`
            : '';
          const metaParts = [opts.includeChords ? toneMeta : '', cats.map(escapeHtml).join(', ')].filter(Boolean);
          return `
        <div class="song">
          <h2>${opts.includeIndex ? `${globalIdx}. ` : ''}${escapeHtml(song.title)}</h2>
          ${metaParts.length ? `<p class="meta">${metaParts.join(' · ')}</p>` : ''}
          <div class="song-body">${buildPrintSongContent(song.content, transpose, opts.includeChords, chordNotation)}</div>
        </div>`;
        })
        .join('')}
    </div>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(opts.title || 'Cancionero')}</title>
<style>
  @page { size: ${pageSizeMap[opts.paperSize] || 'A4'}; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', Courier, monospace; color:#222; margin:0; padding: 10mm; background:#fff; }
  .doc-header { text-align:center; margin-bottom: 6mm; }
  .doc-header h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 16pt; margin:0 0 1.5mm; }
  .doc-header p { font-size: 9.5pt; color:#555; margin:0; }
  .doc-index { font-family: Georgia, serif; font-size: 8.5pt; color:#444; border: 1px solid #ddd; border-radius: 4px; padding: 2.5mm 3.5mm; margin-bottom: 6mm; line-height: 1.5; }
  .page { column-count: ${opts.columns || 1}; column-gap: 8mm; break-after: page; page-break-after: always; }
  .page:last-child { break-after: auto; page-break-after: auto; }
  .song { break-inside: avoid; -webkit-column-break-inside: avoid; page-break-inside: avoid; margin-bottom: 6mm; padding-bottom: 4mm; border-bottom: 1px dashed #ccc; }
  .song h2 { font-family: Georgia, serif; font-size: ${(opts.fontSize || 10) + 3}pt; margin: 0 0 1mm; }
  .song .meta { font-size: ${Math.max(7, (opts.fontSize || 10) - 2)}pt; color:#666; margin: 0 0 2mm; font-family: Georgia, serif; }
  .chord-line { color:#a0362b; font-weight:700; white-space:pre-wrap; font-size:${opts.fontSize || 10}pt; line-height:1.35; }
  .lyric-line { white-space:pre-wrap; font-size:${opts.fontSize || 10}pt; line-height:1.35; }
  @media print { body { padding:0; } }
</style>
</head><body>
  <div class="doc-header">
    <h1>${escapeHtml(opts.title || 'Cancionero')}</h1>
    <p>${formatPrintDate(opts.date)}</p>
  </div>
  ${indexHtml}
  ${pagesHtml || '<p style="text-align:center;color:#888;">No hay canciones seleccionadas.</p>'}
</body></html>`;
}
