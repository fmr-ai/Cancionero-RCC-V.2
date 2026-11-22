import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { Menu, Moon, Radio, Settings, Sun } from 'lucide-react';
import type {
  KeyLockState,
  MainCategory,
  Repertoire,
  Song,
  SongbookData,
} from './types/songbook';
import {
  addMainCategoryToData,
  addSubcategoryToData,
  deleteMainCategoryFromData,
  deleteSubcategoryFromData,
  filterSongs,
  findParentMainCategoryForSub,
  genId,
  migrateData,
  moveRepertoireInData,
  moveSubcategoryInData,
  renameMainCategoryInData,
  renameSubcategoryInData,
  setRepertoirePinnedInData,
  syncFlatCategories,
  SYSTEM_MAIN_IDS,
} from './utils/categories';
import {
  computeSongTransposeForKeyLock,
  detectOriginalRoot,
  suggestSongKey,
} from './utils/chords';
import { DEFAULT_LOGO_URL, loadSongbook, saveSongbook } from './utils/storage';
import { Sidebar } from './components/Sidebar';
import { SongListView } from './components/SongListView';
import { SongReaderView } from './components/SongReaderView';
import { SongEditorModal } from './components/SongEditorModal';
import { CategoryManagerModal, SubcategoryManagerModal } from './components/CategoryModals';
import { OrganizerModal } from './components/OrganizerModal';
import { RepertoireEditorModal, RepertoireManagerModal } from './components/RepertoireModals';
import { PrintModal } from './components/PrintModal';
import { SyncModal } from './components/SyncModal';
import { SettingsModal } from './components/SettingsModal';
import { ChordDiagramModal } from './components/ChordDiagramModal';
import { ConfirmDialog } from './components/ConfirmDialog';

interface SyncSongPayload {
  type: 'song';
  songId: string;
  transpose: number;
  song?: Song;
}

interface SyncLibraryPayload {
  type: 'library';
  songs: Song[];
}

type SyncPayload = SyncSongPayload | SyncLibraryPayload;

const PEER_PREFIX = 'rcc-arica-v1-';

export default function App() {
  const [data, setData] = useState<SongbookData>(() => loadSongbook());

  // Navigation & filter state
  const [activeMainCategoryId, setActiveMainCategoryId] = useState<string | null>(null);
  const [lastMainCategoryId, setLastMainCategoryId] = useState<string | null>(null);
  const [activeSubcategories, setActiveSubcategories] = useState<string[]>([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  // Mobile drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Reader & Repertoire playback state
  const [currentView, setCurrentView] = useState<'list' | 'song'>('list');
  const [currentRepertoireId, setCurrentRepertoireId] = useState<string | null>(null);
  const [currentListIds, setCurrentListIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [currentTranspose, setCurrentTranspose] = useState(0);
  const [listTransposeMap, setListTransposeMap] = useState<Record<string, number>>({});
  const [contextTransposeMap, setContextTransposeMap] = useState<Record<string, number>>({});
  const [keyLock, setKeyLock] = useState<KeyLockState>({
    active: false,
    root: 'C',
    fallbackTranspose: 0,
  });
  const [isStageMode, setIsStageMode] = useState(false);
  const [lyricsOnly, setLyricsOnly] = useState(false);

  // Modals
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [subManagerOpen, setSubManagerOpen] = useState(false);
  const [subManagerParentId, setSubManagerParentId] = useState<string>(SYSTEM_MAIN_IDS.GRUPO);
  const [organizerOpen, setOrganizerOpen] = useState(false);
  const [repManagerOpen, setRepManagerOpen] = useState(false);
  const [repEditorId, setRepEditorId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagramChord, setDiagramChord] = useState<{ american: string; display: string } | null>(null);

  // Confirm & Toast
  const [confirmState, setConfirmState] = useState<{
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // PeerJS Live Sync state
  const [syncMode, setSyncMode] = useState<'idle' | 'host' | 'guest'>('idle');
  const [syncRoomCode, setSyncRoomCode] = useState('');
  const [syncPeerCount, setSyncPeerCount] = useState(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');
  const [guestSharedSong, setGuestSharedSong] = useState<Song | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const hostConnsRef = useRef<DataConnection[]>([]);
  const guestConnRef = useRef<DataConnection | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const updateData = useCallback((updater: (prev: SongbookData) => SongbookData) => {
    setData((prev) => {
      const next = updater(prev);
      syncFlatCategories(next);
      saveSongbook(next);
      return { ...next };
    });
  }, []);

  // Theme & Favicon sync
  const logoUrl = data.settings.logo || DEFAULT_LOGO_URL;

  useEffect(() => {
    const isDark = data.settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, [data.settings.theme]);

  useEffect(() => {
    const fav = document.getElementById('favicon') as HTMLLinkElement | null;
    if (fav) fav.href = logoUrl;
  }, [logoUrl]);

  // Filtered songs
  const filteredSongs = useMemo(
    () =>
      filterSongs(data, {
        activeMainCategoryId,
        activeSubcategories,
        search,
        onlyPending,
      }),
    [data, activeMainCategoryId, activeSubcategories, search, onlyPending]
  );

  // Resolve active parent MainCategory for Sidebar & ListView
  const resolvedParent: MainCategory | null = useMemo(() => {
    if (activeMainCategoryId) {
      return data.mainCategories.find((m) => m.id === activeMainCategoryId) || null;
    }
    if (activeSubcategories.length > 0) {
      return (
        findParentMainCategoryForSub(data.mainCategories, activeSubcategories[0]) ||
        (lastMainCategoryId
          ? data.mainCategories.find((m) => m.id === lastMainCategoryId) || null
          : null)
      );
    }
    return null;
  }, [activeMainCategoryId, activeSubcategories, data.mainCategories, lastMainCategoryId]);

  const songMap = useMemo(() => new Map(data.songs.map((s) => [s.id, s])), [data.songs]);

  const activeSong: Song | null = useMemo(() => {
    if (currentSongId && songMap.has(currentSongId)) return songMap.get(currentSongId) || null;
    if (guestSharedSong && currentSongId === guestSharedSong.id) return guestSharedSong;
    return null;
  }, [currentSongId, songMap, guestSharedSong]);

  // Broadcast live song to guests whenever host is in song view
  const broadcastSong = useCallback(
    (song: Song | null, transpose: number) => {
      if (syncMode !== 'host' || !song) return;
      const payload: SyncSongPayload = {
        type: 'song',
        songId: song.id,
        transpose,
        song,
      };
      hostConnsRef.current.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(payload);
          } catch {
            // ignore closed connection
          }
        }
      });
    },
    [syncMode]
  );

  useEffect(() => {
    if (syncMode === 'host' && currentView === 'song' && activeSong) {
      broadcastSong(activeSong, currentTranspose);
    }
  }, [syncMode, currentView, activeSong, currentTranspose, broadcastSong]);

  // Clean up PeerJS on unmount
  const disconnectSync = useCallback(() => {
    hostConnsRef.current.forEach((c) => {
      try {
        c.close();
      } catch {
        // ignore
      }
    });
    hostConnsRef.current = [];
    if (guestConnRef.current) {
      try {
        guestConnRef.current.close();
      } catch {
        // ignore
      }
      guestConnRef.current = null;
    }
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {
        // ignore
      }
      peerRef.current = null;
    }
    setSyncMode('idle');
    setSyncRoomCode('');
    setSyncPeerCount(0);
    setSyncStatusMessage('');
  }, []);

  useEffect(() => {
    return () => {
      disconnectSync();
    };
  }, [disconnectSync]);

  const startHostSync = () => {
    disconnectSync();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSyncRoomCode(code);
    setSyncMode('host');
    setSyncStatusMessage('Creando sala en vivo...');

    const peer = new Peer(PEER_PREFIX + code, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });
    peerRef.current = peer;

    peer.on('open', () => {
      setSyncStatusMessage('Sala lista. Esperando músicos.');
      showToast(`Sesión en vivo iniciada: ${code}`);
    });

    peer.on('connection', (conn) => {
      hostConnsRef.current.push(conn);
      setSyncPeerCount(hostConnsRef.current.filter((c) => c.open).length || hostConnsRef.current.length);

      conn.on('open', () => {
        setSyncPeerCount(hostConnsRef.current.filter((c) => c.open).length);
        if (currentView === 'song' && activeSong) {
          conn.send({
            type: 'song',
            songId: activeSong.id,
            transpose: currentTranspose,
            song: activeSong,
          } satisfies SyncSongPayload);
        }
      });

      conn.on('close', () => {
        hostConnsRef.current = hostConnsRef.current.filter((c) => c !== conn);
        setSyncPeerCount(hostConnsRef.current.filter((c) => c.open).length);
      });
    });

    peer.on('error', (err) => {
      setSyncStatusMessage(`Error de conexión: ${err.message || 'reintenta'}`);
    });
  };

  const joinGuestSync = (code: string) => {
    disconnectSync();
    const cleanCode = code.replace(/\D/g, '') || code;
    setSyncRoomCode(cleanCode);
    setSyncMode('guest');
    setSyncStatusMessage('Conectando con el director...');

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + cleanCode, { reliable: true });
      guestConnRef.current = conn;

      conn.on('open', () => {
        setSyncStatusMessage('Conectado. Esperando canción del director.');
        showToast(`Conectado a la sala ${cleanCode}`);
      });

      conn.on('data', (raw) => {
        const msg = raw as SyncPayload;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'song') {
          if (msg.song && !songMap.has(msg.songId)) {
            setGuestSharedSong(msg.song);
          } else {
            setGuestSharedSong(null);
          }
          setCurrentRepertoireId(null);
          setCurrentListIds([msg.songId]);
          setCurrentIndex(0);
          setCurrentSongId(msg.songId);
          setCurrentTranspose(msg.transpose || 0);
          setCurrentView('song');
          setSyncStatusMessage(`Siguiendo: ${msg.song?.title || 'canción activa'}`);
        } else if (msg.type === 'library' && Array.isArray(msg.songs)) {
          updateData((prev) => {
            const existingIds = new Set(prev.songs.map((s) => s.id));
            const added = msg.songs.filter((s) => s && s.id && !existingIds.has(s.id));
            return { ...prev, songs: [...prev.songs, ...added] };
          });
          showToast('Cancionero sincronizado desde el director.');
        }
      });

      conn.on('close', () => {
        setSyncStatusMessage('El director cerró la sesión.');
      });
    });

    peer.on('error', () => {
      setSyncStatusMessage('No se pudo encontrar esa sala. Verifica el código.');
    });
  };

  const handleShareLibrary = () => {
    if (syncMode !== 'host') return;
    const payload: SyncLibraryPayload = { type: 'library', songs: data.songs };
    hostConnsRef.current.forEach((conn) => {
      if (conn.open) conn.send(payload);
    });
    showToast(`Cancionero enviado (${data.songs.length} cantos).`);
  };

  // Song navigation helpers
  const computeInitialTranspose = useCallback(
    (song: Song, explicitTranspose?: number): number => {
      if (typeof explicitTranspose === 'number') return explicitTranspose;
      if (keyLock.active) return computeSongTransposeForKeyLock(song, keyLock);
      if (contextTransposeMap[song.id] !== undefined) return contextTransposeMap[song.id];
      return listTransposeMap[song.id] || 0;
    },
    [keyLock, contextTransposeMap, listTransposeMap]
  );

  const openSongFromFiltered = useCallback(
    (songId: string) => {
      const target = songMap.get(songId);
      if (!target) return;
      const ids = filteredSongs.map((s) => s.id);
      const idx = ids.indexOf(songId);
      setGuestSharedSong(null);
      setCurrentRepertoireId(null);
      setCurrentListIds(ids.length > 0 ? ids : [songId]);
      setCurrentIndex(idx >= 0 ? idx : 0);
      setCurrentSongId(songId);
      setCurrentTranspose(computeInitialTranspose(target));
      setCurrentView('song');
      setMobileSidebarOpen(false);
      document.getElementById('mainScroll')?.scrollTo({ top: 0 });
    },
    [songMap, filteredSongs, computeInitialTranspose]
  );

  const playRepertoire = useCallback(
    (repId: string) => {
      const rep = data.repertoires.find((r) => r.id === repId);
      if (!rep) return;
      const validEntries = rep.songs.filter((e) => songMap.has(e.id));
      if (validEntries.length === 0) {
        showToast('Este repertorio aún no tiene canciones.');
        return;
      }
      const ids = validEntries.map((e) => e.id);
      const map: Record<string, number> = {};
      validEntries.forEach((e) => {
        map[e.id] = e.transpose || 0;
      });
      const firstSong = songMap.get(ids[0])!;
      setGuestSharedSong(null);
      setCurrentRepertoireId(rep.id);
      setContextTransposeMap(map);
      setCurrentListIds(ids);
      setCurrentIndex(0);
      setCurrentSongId(ids[0]);
      setCurrentTranspose(
        keyLock.active ? computeSongTransposeForKeyLock(firstSong, keyLock) : map[ids[0]] || 0
      );
      setCurrentView('song');
      setRepManagerOpen(false);
      setRepEditorId(null);
      setMobileSidebarOpen(false);
      document.getElementById('mainScroll')?.scrollTo({ top: 0 });
    },
    [data.repertoires, songMap, keyLock, showToast]
  );

  const stepSong = useCallback(
    (delta: number) => {
      if (currentView !== 'song') return;
      const nextIdx = currentIndex + delta;
      if (nextIdx < 0 || nextIdx >= currentListIds.length) return;
      const nextId = currentListIds[nextIdx];
      const nextSong = songMap.get(nextId);
      if (!nextSong) return;

      setGuestSharedSong(null);
      setCurrentIndex(nextIdx);
      setCurrentSongId(nextId);
      const nextTr = currentRepertoireId
        ? keyLock.active
          ? computeSongTransposeForKeyLock(nextSong, keyLock)
          : contextTransposeMap[nextId] || 0
        : computeInitialTranspose(nextSong);
      setCurrentTranspose(nextTr);
      document.getElementById('mainScroll')?.scrollTo({ top: 0 });
    },
    [
      currentView,
      currentIndex,
      currentListIds,
      songMap,
      currentRepertoireId,
      keyLock,
      contextTransposeMap,
      computeInitialTranspose,
    ]
  );

  // Keyboard navigation in Reader
  useEffect(() => {
    if (currentView !== 'song') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') stepSong(-1);
      if (e.key === 'ArrowRight') stepSong(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentView, stepSong]);

  // Actions
  const handleToggleKeyLock = (active: boolean) => {
    let nextRoot = keyLock.root || 'C';
    if (active && currentView === 'song' && activeSong) {
      const orig = detectOriginalRoot(activeSong);
      if (orig) {
        const idxRoot = [
          'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
        ].indexOf(orig);
        if (idxRoot !== -1) {
          const shifted = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][
            ((idxRoot + currentTranspose) % 12 + 12) % 12
          ];
          nextRoot = shifted;
        }
      }
    }
    const nextLock: KeyLockState = {
      active,
      root: nextRoot,
      fallbackTranspose: currentTranspose,
    };
    setKeyLock(nextLock);
    if (currentView === 'song' && activeSong && active) {
      setCurrentTranspose(computeSongTransposeForKeyLock(activeSong, nextLock));
    }
  };

  const handleChangeKeyLockRoot = (root: string) => {
    const nextLock: KeyLockState = { active: true, root, fallbackTranspose: currentTranspose };
    setKeyLock(nextLock);
    if (currentView === 'song' && activeSong) {
      setCurrentTranspose(computeSongTransposeForKeyLock(activeSong, nextLock));
    }
  };

  const handleTransposeDelta = (delta: number) => {
    const next = currentTranspose + delta;
    setCurrentTranspose(next);
    if (keyLock.active) {
      setKeyLock((prev) => ({ ...prev, active: false }));
    }
    if (currentSongId && !currentRepertoireId) {
      setListTransposeMap((prev) => ({ ...prev, [currentSongId]: next }));
    }
  };

  const handleDeleteSong = (songId: string) => {
    const s = songMap.get(songId);
    if (!s) return;
    setConfirmState({
      message: `¿Eliminar "${s.title}" del cancionero?`,
      confirmLabel: 'Eliminar',
      onConfirm: () => {
        updateData((prev) => ({
          ...prev,
          songs: prev.songs.filter((x) => x.id !== songId),
          repertoires: prev.repertoires.map((r) => ({
            ...r,
            songs: r.songs.filter((e) => e.id !== songId),
          })),
        }));
        if (currentSongId === songId) {
          setCurrentView('list');
          setCurrentSongId(null);
          setIsStageMode(false);
        }
        setConfirmState(null);
        showToast('Canción eliminada.');
      },
    });
  };

  const handleExportJson = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cancionero-rcc-arica-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Respaldo exportado en JSON.');
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const migrated = migrateData(parsed);
      setData(migrated);
      saveSongbook(migrated);
      setActiveMainCategoryId(null);
      setActiveSubcategories([]);
      setCurrentView('list');
      showToast(`Cancionero importado (${migrated.songs.length} canciones).`);
    } catch {
      showToast('El archivo JSON no tiene un formato válido.');
    }
  };

  const activeRepertoire = currentRepertoireId
    ? data.repertoires.find((r) => r.id === currentRepertoireId) || null
    : null;

  const editingSong = editingSongId ? songMap.get(editingSongId) || null : null;
  const editingRepertoire = repEditorId
    ? data.repertoires.find((r) => r.id === repEditorId) || null
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-cream-100 dark:bg-nightbg text-ink dark:text-cream-100 transition-colors duration-200">
      {/* Top Navbar (hidden in Stage mode) */}
      {!isStageMode && (
        <header className="bg-cream-50/95 dark:bg-nightbg-50/95 backdrop-blur border-b border-amber-200/75 dark:border-white/10 shrink-0 z-20">
          <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileSidebarOpen((v) => !v);
                  } else {
                    updateData((prev) => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        sidebarCollapsed: !prev.settings.sidebarCollapsed,
                      },
                    }));
                  }
                }}
                aria-label="Mostrar u ocultar menú lateral"
                className="p-2 rounded-xl hover:bg-amber-100 dark:hover:bg-white/10 transition-colors shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentView('list');
                  setCurrentRepertoireId(null);
                }}
                className="flex items-center gap-2.5 min-w-0 text-left group"
              >
                <img
                  src={logoUrl}
                  alt="Logo RCC Arica"
                  className="w-9 h-9 rounded-full object-cover border border-amber-300 dark:border-amber-400/50 bg-white shrink-0"
                />
                <div className="min-w-0">
                  <span className="block sm:hidden font-display text-sm font-semibold leading-tight truncate group-hover:text-coral-600 dark:group-hover:text-coral-300 transition-colors">
                    RCC Arica
                  </span>
                  <span className="hidden sm:block font-display text-lg font-semibold leading-tight truncate group-hover:text-coral-600 dark:group-hover:text-coral-300 transition-colors">
                    Cancionero RCC Arica
                  </span>
                  <span className="hidden sm:block text-[11px] text-ink/60 dark:text-cream-100/55 truncate">
                    Renovación Carismática Católica
                  </span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSyncOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  syncMode !== 'idle'
                    ? 'bg-coral-500 text-white border-coral-500'
                    : 'bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border-amber-200/80 dark:border-white/10'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>
                  {syncMode === 'host'
                    ? `En vivo (${syncRoomCode})`
                    : syncMode === 'guest'
                    ? `Conectado (${syncRoomCode})`
                    : 'En vivo'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateData((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      theme: prev.settings.theme === 'dark' ? 'light' : 'dark',
                    },
                  }))
                }
                aria-label="Cambiar tema claro u oscuro"
                title="Cambiar tema claro/oscuro"
                className="p-2 rounded-xl bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border border-amber-200/80 dark:border-white/10 transition-colors"
              >
                {data.settings.theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-300" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Abrir configuración"
                title="Configuración"
                className="p-2 rounded-xl bg-white/80 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-white/10 border border-amber-200/80 dark:border-white/10 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Split Workspace */}
      <div className="flex-1 min-h-0 flex relative">
        {!isStageMode && (
          <Sidebar
            collapsedDesktop={data.settings.sidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setCurrentView('list');
            }}
            mainCategories={data.mainCategories}
            activeMainCategoryId={activeMainCategoryId}
            resolvedParent={resolvedParent}
            activeSubcategories={activeSubcategories}
            categoryMenuOpen={categoryMenuOpen}
            onToggleCategoryMenu={() => setCategoryMenuOpen((v) => !v)}
            onShowAll={() => {
              setActiveMainCategoryId(null);
              setLastMainCategoryId(null);
              setActiveSubcategories([]);
              setOnlyPending(false);
              setCurrentView('list');
            }}
            onSelectMainCategory={(id) => {
              setActiveMainCategoryId(id);
              setLastMainCategoryId(id);
              setActiveSubcategories([]);
              setOnlyPending(false);
              setCategoryMenuOpen(false);
              setCurrentView('list');
            }}
            onSelectSubcategory={(sub, parentId) => {
              setOnlyPending(false);
              if (parentId) setLastMainCategoryId(parentId);
              setActiveSubcategories((prev) =>
                prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
              );
              setCurrentView('list');
            }}
            onClearSubcategory={() => {
              setActiveSubcategories([]);
              setCurrentView('list');
            }}
            filteredSongs={filteredSongs}
            currentSongId={currentView === 'song' ? currentSongId : null}
            onOpenSong={openSongFromFiltered}
            onDeleteSong={handleDeleteSong}
            onCloseSidebar={() => {
              setMobileSidebarOpen(false);
              if (window.innerWidth >= 768) {
                updateData((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, sidebarCollapsed: true },
                }));
              }
            }}
            onOpenNewSong={() => {
              setEditingSongId(null);
              setSongModalOpen(true);
            }}
            onOpenCategories={() => setCatManagerOpen(true)}
            onOpenSubcategories={() => {
              setSubManagerParentId(resolvedParent?.id || SYSTEM_MAIN_IDS.GRUPO);
              setSubManagerOpen(true);
            }}
            onOpenRepertoires={() => setRepManagerOpen(true)}
            onExport={handleExportJson}
            onImport={handleImportJson}
          />
        )}

        <main id="mainScroll" className="flex-1 min-w-0 overflow-y-auto">
          {currentView === 'song' && activeSong ? (
            <SongReaderView
              song={activeSong}
              mainCategories={data.mainCategories}
              chordNotation={data.settings.chordNotation}
              fontSize={data.settings.fontSize}
              currentTranspose={currentTranspose}
              positionLabel={
                currentListIds.length > 0 && currentIndex >= 0
                  ? `${currentIndex + 1} / ${currentListIds.length}`
                  : ''
              }
              canPrev={currentIndex > 0}
              canNext={currentIndex >= 0 && currentIndex < currentListIds.length - 1}
              repertoireName={activeRepertoire ? activeRepertoire.name : null}
              keyLocked={keyLock.active}
              lockedRoot={keyLock.root}
              isStageMode={isStageMode}
              lyricsOnly={lyricsOnly}
              isGuestPreviewSong={!!guestSharedSong && activeSong.id === guestSharedSong.id && !songMap.has(activeSong.id)}
              isHostSync={syncMode === 'host'}
              onBackToList={() => {
                setCurrentView('list');
                setIsStageMode(false);
              }}
              onPrevSong={() => stepSong(-1)}
              onNextSong={() => stepSong(1)}
              onTransposeDelta={handleTransposeDelta}
              onChangeFontSize={(delta) =>
                updateData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    fontSize: Math.min(28, Math.max(12, prev.settings.fontSize + delta)),
                  },
                }))
              }
              onToggleKeyLock={handleToggleKeyLock}
              onChangeKeyLockRoot={handleChangeKeyLockRoot}
              onToggleLyricsOnly={() => setLyricsOnly((v) => !v)}
              onToggleStageMode={() => setIsStageMode((v) => !v)}
              onToggleEucaristica={() =>
                updateData((prev) => ({
                  ...prev,
                  songs: prev.songs.map((s) => {
                    if (s.id !== activeSong.id) return s;
                    const nextVal = !s.eucaristica;
                    const mc = new Set(s.mainCategories);
                    if (nextVal) mc.add(SYSTEM_MAIN_IDS.EUCARISTIA);
                    else mc.delete(SYSTEM_MAIN_IDS.EUCARISTIA);
                    return { ...s, eucaristica: nextVal, mainCategories: Array.from(mc) };
                  }),
                }))
              }
              onToggleFavorite={() =>
                updateData((prev) => ({
                  ...prev,
                  songs: prev.songs.map((s) => {
                    if (s.id !== activeSong.id) return s;
                    const nextVal = !s.favorite;
                    const mc = new Set(s.mainCategories);
                    if (nextVal) mc.add(SYSTEM_MAIN_IDS.FAVORITAS);
                    else mc.delete(SYSTEM_MAIN_IDS.FAVORITAS);
                    return { ...s, favorite: nextVal, mainCategories: Array.from(mc) };
                  }),
                }))
              }
              onEditSong={() => {
                setEditingSongId(activeSong.id);
                setSongModalOpen(true);
              }}
              onDeleteSong={() => handleDeleteSong(activeSong.id)}
              onOpenChordDiagram={(ch) => setDiagramChord(ch)}
              onSaveGuestSong={(songToSave) => {
                updateData((prev) => {
                  if (prev.songs.some((x) => x.id === songToSave.id)) return prev;
                  return { ...prev, songs: [...prev.songs, songToSave] };
                });
                setGuestSharedSong(null);
                showToast(`"${songToSave.title}" guardada en tu cancionero.`);
              }}
              onExitRepertoire={() => {
                setCurrentRepertoireId(null);
                setCurrentView('list');
              }}
            />
          ) : (
            <SongListView
              data={data}
              filteredSongs={filteredSongs}
              activeMainCategoryId={activeMainCategoryId}
              resolvedParent={resolvedParent}
              activeSubcategories={activeSubcategories}
              search={search}
              onlyPending={onlyPending}
              keyLock={keyLock}
              listTransposeMap={listTransposeMap}
              currentRepertoireId={currentRepertoireId}
              logoUrl={logoUrl}
              onToggleOnlyPending={() => setOnlyPending((v) => !v)}
              onClearSearch={() => setSearch('')}
              onShowAll={() => {
                setActiveMainCategoryId(null);
                setLastMainCategoryId(null);
                setActiveSubcategories([]);
                setOnlyPending(false);
                setSearch('');
              }}
              onSelectMainCategory={(id) => {
                setActiveMainCategoryId(id);
                setLastMainCategoryId(id);
                setActiveSubcategories([]);
                setOnlyPending(false);
              }}
              onToggleSubcategory={(sub, parentId) => {
                setOnlyPending(false);
                if (parentId) setLastMainCategoryId(parentId);
                setActiveSubcategories((prev) =>
                  prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
                );
              }}
              onClearSubcategories={() => setActiveSubcategories([])}
              onOpenNewSong={() => {
                setEditingSongId(null);
                setSongModalOpen(true);
              }}
              onOpenRepertoires={() => setRepManagerOpen(true)}
              onOpenOrganizer={() => setOrganizerOpen(true)}
              onOpenPrint={() => setPrintOpen(true)}
              onToggleKeyLock={handleToggleKeyLock}
              onChangeKeyLockRoot={handleChangeKeyLockRoot}
              onToggleRepertoiresBar={() =>
                updateData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    repertoiresBarOpen: !prev.settings.repertoiresBarOpen,
                  },
                }))
              }
              onPlayRepertoire={playRepertoire}
              onMoveRepertoire={(repId, delta) =>
                updateData((prev) => {
                  const copy = { ...prev, repertoires: [...prev.repertoires] };
                  moveRepertoireInData(copy, repId, delta);
                  return copy;
                })
              }
              onToggleRepertoirePinned={(repId, pinned) =>
                updateData((prev) => {
                  const copy = {
                    ...prev,
                    repertoires: prev.repertoires.map((r) => ({ ...r })),
                  };
                  setRepertoirePinnedInData(copy, repId, pinned);
                  return copy;
                })
              }
              onOpenSong={openSongFromFiltered}
              onTransposeSongInList={(songId, delta) =>
                setListTransposeMap((prev) => ({
                  ...prev,
                  [songId]: (prev[songId] || 0) + delta,
                }))
              }
              onToggleFavorite={(songId) =>
                updateData((prev) => ({
                  ...prev,
                  songs: prev.songs.map((s) => {
                    if (s.id !== songId) return s;
                    const nextVal = !s.favorite;
                    const mc = new Set(s.mainCategories);
                    if (nextVal) mc.add(SYSTEM_MAIN_IDS.FAVORITAS);
                    else mc.delete(SYSTEM_MAIN_IDS.FAVORITAS);
                    return { ...s, favorite: nextVal, mainCategories: Array.from(mc) };
                  }),
                }))
              }
              onToggleEucaristica={(songId) =>
                updateData((prev) => ({
                  ...prev,
                  songs: prev.songs.map((s) => {
                    if (s.id !== songId) return s;
                    const nextVal = !s.eucaristica;
                    const mc = new Set(s.mainCategories);
                    if (nextVal) mc.add(SYSTEM_MAIN_IDS.EUCARISTIA);
                    else mc.delete(SYSTEM_MAIN_IDS.EUCARISTIA);
                    return { ...s, eucaristica: nextVal, mainCategories: Array.from(mc) };
                  }),
                }))
              }
              onEditSong={(songId) => {
                setEditingSongId(songId);
                setSongModalOpen(true);
              }}
              onDeleteSong={handleDeleteSong}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <SongEditorModal
        open={songModalOpen}
        editingSong={editingSong}
        mainCategories={data.mainCategories}
        chordNotation={data.settings.chordNotation}
        onClose={() => {
          setSongModalOpen(false);
          setEditingSongId(null);
        }}
        onSave={(payload) => {
          const isFav = payload.mainCategories.includes(SYSTEM_MAIN_IDS.FAVORITAS);
          const isEuc = payload.mainCategories.includes(SYSTEM_MAIN_IDS.EUCARISTIA);
          if (payload.id) {
            updateData((prev) => ({
              ...prev,
              songs: prev.songs.map((s) =>
                s.id === payload.id
                  ? {
                      ...s,
                      title: payload.title,
                      key: payload.key,
                      categories: payload.categories,
                      mainCategories: payload.mainCategories,
                      favorite: s.favorite || isFav,
                      eucaristica: isEuc || s.eucaristica,
                      content: payload.content,
                    }
                  : s
              ),
            }));
            showToast('Canción actualizada.');
          } else {
            const newId = genId();
            const newSong: Song = {
              id: newId,
              title: payload.title,
              key: payload.key,
              categories: payload.categories,
              mainCategories: payload.mainCategories,
              favorite: isFav,
              eucaristica: isEuc,
              content: payload.content,
            };
            updateData((prev) => ({
              ...prev,
              songs: [...prev.songs, newSong],
            }));
            showToast('Canción creada.');
          }
          setSongModalOpen(false);
          setEditingSongId(null);
        }}
        onQuickAddSubcategory={(parentId, name) => {
          let added = false;
          updateData((prev) => {
            const copy = {
              ...prev,
              mainCategories: prev.mainCategories.map((m) => ({
                ...m,
                subcategories: [...m.subcategories],
              })),
            };
            const res = addSubcategoryToData(copy, parentId, name);
            if (!res.ok) {
              showToast(res.error);
              return prev;
            }
            added = true;
            return copy;
          });
          if (added) showToast(`Subcategoría "${name}" creada.`);
          return added;
        }}
      />

      <CategoryManagerModal
        open={catManagerOpen}
        mainCategories={data.mainCategories}
        onClose={() => setCatManagerOpen(false)}
        onAddMain={(name, icon) => {
          let ok = false;
          updateData((prev) => {
            const copy = {
              ...prev,
              mainCategories: prev.mainCategories.map((m) => ({
                ...m,
                subcategories: [...m.subcategories],
              })),
            };
            const res = addMainCategoryToData(copy, name, icon);
            if (!res.ok) {
              showToast(res.error);
              return prev;
            }
            ok = true;
            return copy;
          });
          if (ok) showToast(`Categoría "${name}" creada.`);
          return ok;
        }}
        onRenameMain={(mainId, newName) => {
          updateData((prev) => {
            const copy = {
              ...prev,
              mainCategories: prev.mainCategories.map((m) => ({
                ...m,
                subcategories: [...m.subcategories],
              })),
            };
            const res = renameMainCategoryInData(copy, mainId, newName);
            if (!res.ok) {
              showToast(res.error);
              return prev;
            }
            return copy;
          });
        }}
        onDeleteMain={(mainId) => {
          const mc = data.mainCategories.find((m) => m.id === mainId);
          if (!mc) return;
          setConfirmState({
            message: `¿Eliminar la categoría "${mc.name}"? Las canciones permanecerán en el cancionero.`,
            confirmLabel: 'Eliminar',
            onConfirm: () => {
              updateData((prev) => {
                const copy = {
                  ...prev,
                  songs: prev.songs.map((s) => ({ ...s })),
                  mainCategories: prev.mainCategories.map((m) => ({
                    ...m,
                    subcategories: [...m.subcategories],
                  })),
                };
                const res = deleteMainCategoryFromData(copy, mainId);
                if (!res.ok) {
                  showToast(res.error);
                  return prev;
                }
                return copy;
              });
              if (activeMainCategoryId === mainId) setActiveMainCategoryId(null);
              setConfirmState(null);
              showToast('Categoría eliminada.');
            },
          });
        }}
        onOpenSubcategoriesFor={(mainId) => {
          setCatManagerOpen(false);
          setSubManagerParentId(mainId);
          setSubManagerOpen(true);
        }}
        onOpenOrganizer={() => {
          setCatManagerOpen(false);
          setOrganizerOpen(true);
        }}
      />

      <SubcategoryManagerModal
        open={subManagerOpen}
        preselectedParentId={subManagerParentId}
        mainCategories={data.mainCategories}
        onClose={() => setSubManagerOpen(false)}
        onAddSub={(parentId, subName) => {
          let ok = false;
          updateData((prev) => {
            const copy = {
              ...prev,
              mainCategories: prev.mainCategories.map((m) => ({
                ...m,
                subcategories: [...m.subcategories],
              })),
            };
            const res = addSubcategoryToData(copy, parentId, subName);
            if (!res.ok) {
              showToast(res.error);
              return prev;
            }
            ok = true;
            return copy;
          });
          if (ok) showToast(`Subcategoría "${subName}" añadida.`);
          return ok;
        }}
        onRenameSub={(parentId, oldName, newName) => {
          updateData((prev) => {
            const copy = {
              ...prev,
              songs: prev.songs.map((s) => ({ ...s, categories: [...s.categories] })),
              mainCategories: prev.mainCategories.map((m) => ({
                ...m,
                subcategories: [...m.subcategories],
              })),
            };
            const res = renameSubcategoryInData(copy, parentId, oldName, newName);
            if (!res.ok) {
              showToast(res.error);
              return prev;
            }
            return copy;
          });
        }}
        onMoveSub={(fromId, toId, subName) => {
          updateData((prev) => {
            const copy = {
              ...prev,
              mainCategories: prev.mainCategories.map((m) => ({
                ...m,
                subcategories: [...m.subcategories],
              })),
            };
            const res = moveSubcategoryInData(copy, fromId, toId, subName);
            if (!res.ok) {
              showToast(res.error);
              return prev;
            }
            return copy;
          });
          showToast(`"${subName}" movida.`);
        }}
        onDeleteSub={(parentId, subName) => {
          setConfirmState({
            message: `¿Eliminar la subcategoría "${subName}"? Se quitará de las canciones que la tengan.`,
            confirmLabel: 'Eliminar',
            onConfirm: () => {
              updateData((prev) => {
                const copy = {
                  ...prev,
                  songs: prev.songs.map((s) => ({ ...s, categories: [...s.categories] })),
                  mainCategories: prev.mainCategories.map((m) => ({
                    ...m,
                    subcategories: [...m.subcategories],
                  })),
                };
                deleteSubcategoryFromData(copy, parentId, subName);
                return copy;
              });
              setActiveSubcategories((prev) => prev.filter((s) => s !== subName));
              setConfirmState(null);
              showToast('Subcategoría eliminada.');
            },
          });
        }}
      />

      <OrganizerModal
        open={organizerOpen}
        songs={data.songs}
        mainCategories={data.mainCategories}
        chordNotation={data.settings.chordNotation}
        onClose={() => setOrganizerOpen(false)}
        onAutoDetectAllKeys={() => {
          let count = 0;
          updateData((prev) => ({
            ...prev,
            songs: prev.songs.map((s) => {
              if (s.key) return s;
              const sug = suggestSongKey(s);
              if (!sug) return s;
              count++;
              return { ...s, key: sug.key };
            }),
          }));
          showToast(
            count > 0
              ? `Se detectó tonalidad en ${count} ${count === 1 ? 'canción' : 'canciones'}.`
              : 'Todas las canciones con acordes ya tenían tono.'
          );
          return count;
        }}
        onUpdateSongMeta={(songId, patch) => {
          updateData((prev) => ({
            ...prev,
            songs: prev.songs.map((s) =>
              s.id === songId
                ? {
                    ...s,
                    key: patch.key,
                    categories: patch.categories,
                    mainCategories: patch.mainCategories,
                    eucaristica: patch.mainCategories.includes(SYSTEM_MAIN_IDS.EUCARISTIA),
                    favorite: patch.mainCategories.includes(SYSTEM_MAIN_IDS.FAVORITAS),
                  }
                : s
            ),
          }));
          showToast('Cambios guardados.');
        }}
      />

      <RepertoireManagerModal
        open={repManagerOpen}
        repertoires={data.repertoires}
        onClose={() => setRepManagerOpen(false)}
        onCreateRepertoire={(name) => {
          const newRep: Repertoire = {
            id: genId(),
            name,
            songs: [],
            mode: 'original',
            uniformKey: 'C',
            pinnedInBar: true,
          };
          updateData((prev) => ({
            ...prev,
            repertoires: [...prev.repertoires, newRep],
          }));
          setRepManagerOpen(false);
          setRepEditorId(newRep.id);
          showToast(`Repertorio "${name}" creado.`);
        }}
        onRenameRepertoire={(repId, name) =>
          updateData((prev) => ({
            ...prev,
            repertoires: prev.repertoires.map((r) => (r.id === repId ? { ...r, name } : r)),
          }))
        }
        onMoveRepertoire={(repId, delta) =>
          updateData((prev) => {
            const copy = { ...prev, repertoires: [...prev.repertoires] };
            moveRepertoireInData(copy, repId, delta);
            return copy;
          })
        }
        onTogglePinned={(repId, pinned) =>
          updateData((prev) => ({
            ...prev,
            repertoires: prev.repertoires.map((r) =>
              r.id === repId ? { ...r, pinnedInBar: pinned } : r
            ),
          }))
        }
        onEditRepertoire={(repId) => {
          setRepManagerOpen(false);
          setRepEditorId(repId);
        }}
        onPlayRepertoire={playRepertoire}
        onDeleteRepertoire={(repId) => {
          const rep = data.repertoires.find((r) => r.id === repId);
          if (!rep) return;
          setConfirmState({
            message: `¿Eliminar el repertorio "${rep.name}"?`,
            confirmLabel: 'Eliminar',
            onConfirm: () => {
              updateData((prev) => ({
                ...prev,
                repertoires: prev.repertoires.filter((r) => r.id !== repId),
              }));
              if (currentRepertoireId === repId) setCurrentRepertoireId(null);
              setConfirmState(null);
              showToast('Repertorio eliminado.');
            },
          });
        }}
      />

      <RepertoireEditorModal
        open={!!repEditorId}
        repertoire={editingRepertoire}
        songs={data.songs}
        mainCategories={data.mainCategories}
        chordNotation={data.settings.chordNotation}
        onClose={() => setRepEditorId(null)}
        onUpdateRepertoire={(updated) =>
          updateData((prev) => ({
            ...prev,
            repertoires: prev.repertoires.map((r) => (r.id === updated.id ? updated : r)),
          }))
        }
        onPlayRepertoire={playRepertoire}
      />

      <PrintModal
        open={printOpen}
        songs={data.songs}
        repertoires={data.repertoires}
        mainCategories={data.mainCategories}
        chordNotation={data.settings.chordNotation}
        listTransposeMap={listTransposeMap}
        initialRepertoireId={currentRepertoireId}
        onClose={() => setPrintOpen(false)}
        onToast={showToast}
      />

      <SyncModal
        open={syncOpen}
        mode={syncMode}
        roomCode={syncRoomCode}
        peerCount={syncPeerCount}
        statusMessage={syncStatusMessage}
        onClose={() => setSyncOpen(false)}
        onStartHost={startHostSync}
        onJoinGuest={joinGuestSync}
        onDisconnect={() => {
          disconnectSync();
          showToast('Sesión en vivo finalizada.');
        }}
        onShareLibrary={handleShareLibrary}
      />

      <SettingsModal
        open={settingsOpen}
        logoUrl={logoUrl}
        chordNotation={data.settings.chordNotation}
        onClose={() => setSettingsOpen(false)}
        onUploadLogo={(file) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              updateData((prev) => ({
                ...prev,
                settings: { ...prev.settings, logo: reader.result as string },
              }));
              showToast('Logo actualizado.');
            }
          };
          reader.readAsDataURL(file);
        }}
        onApplyLogoUrl={(url) => {
          updateData((prev) => ({
            ...prev,
            settings: { ...prev.settings, logo: url },
          }));
          showToast('Logo actualizado desde URL.');
        }}
        onResetLogo={() => {
          updateData((prev) => ({
            ...prev,
            settings: { ...prev.settings, logo: null },
          }));
          showToast('Logo restablecido.');
        }}
        onChangeNotation={(notation) => {
          updateData((prev) => ({
            ...prev,
            settings: { ...prev.settings, chordNotation: notation },
          }));
          showToast(
            notation === 'latin' ? 'Notación cambiada a Latina (Do Re Mi).' : 'Notación cambiada a Americana (C D E).'
          );
        }}
        onOpenPrint={() => setPrintOpen(true)}
      />

      <ChordDiagramModal
        chord={diagramChord}
        chordNotation={data.settings.chordNotation}
        onClose={() => setDiagramChord(null)}
      />

      <ConfirmDialog
        message={confirmState?.message || null}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-ink-900 text-cream-50 dark:bg-cream-50 dark:text-ink-900 text-xs font-medium shadow-lg pointer-events-none max-w-[90vw] text-center"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
