import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ChordNotation } from '../types/songbook';
import { formatRootForDisplay, NOTES_SHARP } from '../utils/chords';
import { getChordDiagramData, type ChordShape } from '../utils/chordDiagrams';

interface ChordDiagramModalProps {
  chord: { american: string; display: string } | null;
  chordNotation: ChordNotation;
  onClose: () => void;
}

const GuitarDiagramSVG: React.FC<{ shape: ChordShape }> = ({ shape }) => {
  const width = 156;
  const height = 184;
  const leftMargin = 28;
  const topMargin = 38;
  const gridWidth = 100;
  const gridHeight = 108;
  const fretsShown = 4;
  const stringGap = gridWidth / 5;
  const fretGap = gridHeight / fretsShown;

  const rowOf = (v: number) => (shape.baseFret === 0 ? v : v - shape.baseFret + 1);

  const fretted = shape.frets
    .map((v, i) => ({ v, i }))
    .filter((o): o is { v: number; i: number } => typeof o.v === 'number' && o.v > 0);
  let barreRect: { x1: number; x2: number; y: number } | null = null;
  if (shape.barre && fretted.length) {
    const minFret = Math.min(...fretted.map((o) => o.v));
    const barreIdx = fretted.filter((o) => o.v === minFret).map((o) => o.i);
    if (barreIdx.length >= 2) {
      barreRect = {
        x1: leftMargin + Math.min(...barreIdx) * stringGap,
        x2: leftMargin + Math.max(...barreIdx) * stringGap,
        y: topMargin + (rowOf(minFret) - 0.5) * fretGap,
      };
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-40 h-44 mx-auto" role="img" aria-label="Diagrama de guitarra">
      {shape.baseFret > 0 ? (
        <>
          <text x={leftMargin - 16} y={topMargin + fretGap * 0.65} fontSize="11" fontWeight="600" fill="#4A3B32">
            {shape.baseFret}
          </text>
          <line x1={leftMargin} y1={topMargin} x2={leftMargin + gridWidth} y2={topMargin} stroke="#4A3B32" strokeWidth="1.5" />
        </>
      ) : (
        <rect x={leftMargin} y={topMargin - 3} width={gridWidth} height="4" fill="#4A3B32" />
      )}

      {Array.from({ length: fretsShown }, (_, idx) => {
        const y = topMargin + (idx + 1) * fretGap;
        return (
          <line key={idx} x1={leftMargin} y1={y} x2={leftMargin + gridWidth} y2={y} stroke="#c9b393" strokeWidth="1" />
        );
      })}

      {Array.from({ length: 6 }, (_, s) => {
        const x = leftMargin + s * stringGap;
        return (
          <line key={s} x1={x} y1={topMargin} x2={x} y2={topMargin + gridHeight} stroke="#c9b393" strokeWidth="1.2" />
        );
      })}

      {shape.frets.map((val, i) => {
        const x = leftMargin + i * stringGap;
        if (val === 'x') {
          return (
            <text key={i} x={x} y={topMargin - 12} fontSize="11" textAnchor="middle" fill="#AE5F51" fontWeight="700">
              ✕
            </text>
          );
        }
        if (val === 0) {
          return <circle key={i} cx={x} cy={topMargin - 12} r="4" fill="none" stroke="#4A3B32" strokeWidth="1.4" />;
        }
        return null;
      })}

      {barreRect && (
        <rect
          x={barreRect.x1 - 7}
          y={barreRect.y - 7}
          width={barreRect.x2 - barreRect.x1 + 14}
          height="14"
          rx="7"
          fill="#AE5F51"
          opacity="0.88"
        />
      )}

      {shape.frets.map((val, i) => {
        if (typeof val === 'number' && val > 0) {
          const x = leftMargin + i * stringGap;
          const y = topMargin + (rowOf(val) - 0.5) * fretGap;
          return <circle key={i} cx={x} cy={y} r="6.5" fill="#AE5F51" />;
        }
        return null;
      })}
    </svg>
  );
};

const PianoDiagramSVG: React.FC<{ activePitchClasses: number[] }> = ({ activePitchClasses }) => {
  const activeSet = new Set(activePitchClasses);
  const whiteNotes = [0, 2, 4, 5, 7, 9, 11];
  const blackNotes = [
    { pc: 1, xOffset: 0.7 },
    { pc: 3, xOffset: 1.7 },
    { pc: 6, xOffset: 3.7 },
    { pc: 8, xOffset: 4.7 },
    { pc: 10, xOffset: 5.7 },
  ];
  const keyW = 24;
  const keyH = 92;
  const totalW = whiteNotes.length * keyW;

  return (
    <svg viewBox={`0 0 ${totalW} ${keyH}`} className="w-48 h-28 mx-auto" role="img" aria-label="Diagrama de teclado">
      {whiteNotes.map((pc, idx) => {
        const active = activeSet.has(pc);
        return (
          <rect
            key={pc}
            x={idx * keyW}
            y={0}
            width={keyW - 1}
            height={keyH}
            rx={2}
            fill={active ? '#CD7C6C' : '#FFFFFF'}
            stroke="#4A3B32"
            strokeWidth="1"
          />
        );
      })}
      {blackNotes.map(({ pc, xOffset }) => {
        const active = activeSet.has(pc);
        return (
          <rect
            key={pc}
            x={xOffset * keyW}
            y={0}
            width={keyW * 0.62}
            height={keyH * 0.6}
            rx={2}
            fill={active ? '#AE5F51' : '#2A211C'}
            stroke="#2A211C"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
};

export const ChordDiagramModal: React.FC<ChordDiagramModalProps> = ({
  chord,
  chordNotation,
  onClose,
}) => {
  const [instrument, setInstrument] = useState<'guitar' | 'piano'>('guitar');

  useEffect(() => {
    if (!chord) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chord, onClose]);

  if (!chord) return null;

  const data = getChordDiagramData(chord.american);
  const bassNote = chord.american.includes('/') ? chord.american.split('/')[1] : null;
  const pianoLabels = data
    ? data.pianoNotes.map((pc) => formatRootForDisplay(NOTES_SHARP[pc], chordNotation)).join(' · ')
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={`Diagrama del acorde ${chord.display}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl p-5 max-w-xs w-full text-center border border-amber-200 dark:border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-xl font-semibold">{chord.display}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar diagrama"
            className="p-1.5 hover:bg-amber-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!data ? (
          <p className="text-sm text-ink/75 dark:text-cream-100/75 mb-4">
            No se pudo reconocer este acorde ({chord.display}) para mostrar el diagrama.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-1 p-1 mb-3 bg-amber-100/70 dark:bg-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => setInstrument('guitar')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  instrument === 'guitar'
                    ? 'bg-white dark:bg-nightbg-50 text-ink dark:text-cream-100 shadow-sm'
                    : 'text-ink/65 dark:text-cream-100/65 hover:text-ink'
                }`}
              >
                Guitarra
              </button>
              <button
                type="button"
                onClick={() => setInstrument('piano')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  instrument === 'piano'
                    ? 'bg-white dark:bg-nightbg-50 text-ink dark:text-cream-100 shadow-sm'
                    : 'text-ink/65 dark:text-cream-100/65 hover:text-ink'
                }`}
              >
                Teclado
              </button>
            </div>

            <div className="flex items-center justify-center bg-white rounded-xl p-4 mb-3 min-h-[188px] border border-amber-200/60">
              {instrument === 'guitar' ? (
                <GuitarDiagramSVG shape={data.shape} />
              ) : (
                <div className="space-y-3">
                  <PianoDiagramSVG activePitchClasses={data.pianoNotes} />
                  <p className="text-xs font-semibold text-ink">Notas: {pianoLabels}</p>
                </div>
              )}
            </div>

            <p className="text-xs text-ink/65 dark:text-cream-100/60 leading-relaxed">
              {instrument === 'guitar'
                ? `${data.shape.approx ? 'Forma aproximada para esta variante. ' : ''}${
                    data.shape.barre ? 'Acorde con cejilla.' : 'Posición abierta.'
                  }`
                : `Notas del acorde: ${pianoLabels}.`}
              {bassNote ? ` Bajo sugerido en ${bassNote}.` : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
