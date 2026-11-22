import React, { useEffect, useState } from 'react';
import { Check, Copy, Radio, Send, Users, X } from 'lucide-react';

export interface SyncModalProps {
  open: boolean;
  mode: 'idle' | 'host' | 'guest';
  roomCode: string;
  peerCount: number;
  statusMessage: string;
  onClose: () => void;
  onStartHost: () => void;
  onJoinGuest: (code: string) => void;
  onDisconnect: () => void;
  onShareLibrary: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  open,
  mode,
  roomCode,
  peerCount,
  statusMessage,
  onClose,
  onStartHost,
  onJoinGuest,
  onDisconnect,
  onShareLibrary,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink-900/55 dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="En vivo entre músicos"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 dark:bg-nightbg-100 rounded-2xl w-full max-w-md p-5 border border-amber-200/70 dark:border-white/10 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-lg font-semibold">En vivo entre músicos</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 hover:bg-amber-100 dark:hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-ink/70 dark:text-cream-100/70 leading-relaxed">
          Conecta celulares o tablets en tiempo real para que todo el ministerio vea automáticamente el canto y el tono que estás tocando.
        </p>

        {mode === 'idle' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-white/75 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 space-y-2">
              <p className="text-xs font-semibold">1. Dirigir sesión (Host)</p>
              <p className="text-xs text-ink/65 dark:text-cream-100/65">
                Genera un código de sala de 6 dígitos para que otros músicos se unan.
              </p>
              <button
                type="button"
                onClick={onStartHost}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-coral-500 hover:bg-coral-600 text-white py-2 rounded-xl text-xs font-semibold"
              >
                <Radio className="w-3.5 h-3.5" />
                Iniciar sesión en vivo
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = joinCode.trim();
                if (clean.length >= 4) onJoinGuest(clean);
              }}
              className="p-3.5 rounded-xl bg-white/75 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 space-y-2"
            >
              <p className="text-xs font-semibold">2. Unirse como músico</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\s+/g, ''))}
                  placeholder="Código de 6 dígitos"
                  aria-label="Código de sala"
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-amber-200 dark:border-white/10 text-sm font-mono tracking-wider"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold whitespace-nowrap"
                >
                  Unirse
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === 'host' && (
          <div className="p-4 rounded-xl bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 space-y-3 text-center">
            <p className="text-xs text-ink/65 dark:text-cream-100/65">Comparte este código con tu equipo:</p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-widest text-coral-600 dark:text-coral-300">
                {roomCode}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar código de sala"
                className="p-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20"
              >
                {copied ? <Check className="w-4 h-4 text-coral-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-ink/75 dark:text-cream-100/75 tabular-nums">
              <Users className="w-3.5 h-3.5 text-coral-500" />
              {peerCount} {peerCount === 1 ? 'músico conectado' : 'músicos conectados'}
            </p>
            {statusMessage && (
              <p className="text-[11px] text-ink/60 dark:text-cream-100/60">{statusMessage}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={onShareLibrary}
                disabled={peerCount === 0}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 dark:bg-white/10 hover:bg-amber-200 dark:hover:bg-white/20 text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar cancionero
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                className="flex-1 px-3 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold whitespace-nowrap"
              >
                Terminar sesión
              </button>
            </div>
          </div>
        )}

        {mode === 'guest' && (
          <div className="p-4 rounded-xl bg-white/80 dark:bg-white/5 border border-amber-200/80 dark:border-white/10 space-y-3 text-center">
            <p className="text-xs font-semibold text-coral-600 dark:text-coral-300">
              Conectado a sala <span className="font-mono">{roomCode}</span>
            </p>
            <p className="text-xs text-ink/70 dark:text-cream-100/70">
              {statusMessage || 'Esperando al director para cambiar de canción automáticamente.'}
            </p>
            <button
              type="button"
              onClick={onDisconnect}
              className="w-full py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold"
            >
              Salir de la sala
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
