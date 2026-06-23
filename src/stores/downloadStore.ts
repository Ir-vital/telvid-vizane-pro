import { create } from "zustand";
import type { VideoInfo, DownloadedVideo, PremiumStatus, ProgressPayload } from "../lib/tauri";

export interface ActiveDownload {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  format?: string;
  percent: number;
  speed_mbps: number;
  eta_seconds: number;
  downloaded_bytes?: number;
  total_bytes?: number;
  status: string;
  status_label: string;
}

// Phase du workflow principal — un seul bouton, plusieurs états
export type DownloadPhase =
  | "idle"          // URL vide ou invalide
  | "ready"         // URL valide détectée, prêt à lancer
  | "analyzing"     // Analyse en cours (yt-dlp --dump-json)
  | "pick_format"   // Métadonnées reçues, choix du format
  | "downloading"   // Téléchargement en cours
  | "done"          // Terminé
  | "error";        // Erreur

interface DownloadStore {
  videoInfo: VideoInfo | null;
  isAnalyzing: boolean;
  analyzeError: string | null;
  currentUrl: string;
  downloadPhase: DownloadPhase;

  activeDownloads: ActiveDownload[];
  library: DownloadedVideo[];
  premium: PremiumStatus | null;

  outputPath: string;
  turboMode: boolean;
  language: string;
  alwaysAskFolder: boolean;
  settingsOpen: boolean;
  premiumOpen: boolean;

  sidebarOpen: boolean;
  sidebarTab: "library" | "converter";
  playerVideo: DownloadedVideo | null;
  toasts: Toast[];

  setVideoInfo: (info: VideoInfo | null) => void;
  setIsAnalyzing: (v: boolean) => void;
  setAnalyzeError: (e: string | null) => void;
  setCurrentUrl: (url: string) => void;
  setDownloadPhase: (p: DownloadPhase) => void;
  addDownload: (d: ActiveDownload) => void;
  updateDownloadProgress: (payload: ProgressPayload) => void;
  removeDownload: (id: string) => void;
  setLibrary: (lib: DownloadedVideo[]) => void;
  setPremium: (p: PremiumStatus) => void;
  setOutputPath: (p: string) => void;
  setTurboMode: (v: boolean) => void;
  setLanguage: (l: string) => void;
  setAlwaysAskFolder: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setPremiumOpen: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setSidebarTab: (t: "library" | "converter") => void;
  setPlayerVideo: (v: DownloadedVideo | null) => void;
  addToast: (t: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  videoInfo: null,
  isAnalyzing: false,
  analyzeError: null,
  currentUrl: "",
  downloadPhase: "idle",
  activeDownloads: [],
  library: [],
  premium: null,
  outputPath: "",
  turboMode: false,
  language: localStorage.getItem("lang") || "fr",
  alwaysAskFolder: false,
  settingsOpen: false,
  premiumOpen: false,
  sidebarOpen: false,
  sidebarTab: "library",
  playerVideo: null,
  toasts: [],

  setVideoInfo: (info) => set({ videoInfo: info }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setAnalyzeError: (e) => set({ analyzeError: e }),
  setCurrentUrl: (url) => {
    // Détecte automatiquement si l'URL est valide pour passer en "ready"
    const isValid = url.startsWith("http://") || url.startsWith("https://");
    set({ currentUrl: url, downloadPhase: isValid ? "ready" : "idle", videoInfo: null, analyzeError: null });
  },
  setDownloadPhase: (p) => set({ downloadPhase: p }),

  addDownload: (d) => set((s) => ({ activeDownloads: [...s.activeDownloads, d] })),

  updateDownloadProgress: (payload) =>
    set((s) => ({
      activeDownloads: s.activeDownloads.map((d) =>
        d.id === payload.download_id
          ? { ...d, percent: payload.percent, speed_mbps: payload.speed_mbps, eta_seconds: payload.eta_seconds, status: payload.status, status_label: payload.status_label }
          : d
      ),
    })),

  removeDownload: (id) => set((s) => ({ activeDownloads: s.activeDownloads.filter((d) => d.id !== id) })),

  setLibrary: (lib) => set({ library: lib }),
  setPremium: (p) => set({ premium: p }),
  setOutputPath: (p) => set({ outputPath: p }),
  setTurboMode: (v) => set({ turboMode: v }),
  setLanguage: (l) => {
    localStorage.setItem("lang", l);
    set({ language: l });
  },
  setAlwaysAskFolder: (v) => set({ alwaysAskFolder: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setPremiumOpen: (v) => set({ premiumOpen: v }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setSidebarTab: (t) => set({ sidebarTab: t }),
  setPlayerVideo: (v) => set({ playerVideo: v }),

  addToast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
