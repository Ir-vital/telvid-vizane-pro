import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface FormatOption {
  id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  fps?: number;
  codec: string;
}

export interface VideoInfo {
  title: string;
  uploader: string;
  thumbnail: string;
  duration_seconds: number;
  formats: FormatOption[];
  platform: string;
}

export interface DownloadConfig {
  url: string;
  format_id: string;
  output_path: string;
  priority: number;
  turbo_mode: boolean;
  auto_convert_mp4: boolean;
  extract_audio: boolean;
  // Métadonnées pour l'insert en base
  title: string;
  uploader: string;
  thumbnail: string;
  duration_seconds: number;
  platform: string;
  quality: string;
}

export interface ProgressPayload {
  download_id: string;
  percent: number;
  speed_mbps: number;
  eta_seconds: number;
  status: string;
  status_label: string;
}

export interface DownloadedVideo {
  id: string;
  title: string;
  uploader: string;
  thumbnail_path: string;
  file_path: string;
  duration_seconds: number;
  file_size_mb: number;
  downloaded_at: string;
  platform: string;
  format: string;
  quality: string;
  source_url: string;
}

export interface PremiumStatus {
  is_premium: boolean;
  max_resolution: string;
  turbo_mode: boolean;
  concurrent_downloads: number;
}

export const tauriApi = {
  getVideoInfo: (url: string) => invoke<VideoInfo>("get_video_info", { url }),
  startDownload: (config: DownloadConfig) => invoke<string>("start_download", { config }),
  cancelDownload: (downloadId: string) => invoke<void>("cancel_download", { downloadId }),
  convertToMp4: (inputPath: string) => invoke<string>("convert_to_mp4", { inputPath }),
  extractAudio: (inputPath: string, quality: number) => invoke<string>("extract_audio", { inputPath, quality }),
  getLibrary: () => invoke<DownloadedVideo[]>("get_library"),
  deleteVideo: (id: string) => invoke<void>("delete_video", { id }),
  openFile: (path: string) => invoke<void>("open_file", { path }),
  openFolder: (path: string) => invoke<void>("open_folder", { path }),
  checkPremiumStatus: () => invoke<PremiumStatus>("check_premium_status"),
  refreshLibraryMetadata: () => invoke<number>("refresh_library_metadata"),
  getDownloadDir: () => invoke<string>("get_download_dir"),
  setDownloadDir: (path: string) => invoke<string>("set_download_dir", { path }),
  openDownloadDir: () => invoke<void>("open_download_dir"),
  getSettings: () => invoke<{ download_path: string; always_ask_folder: boolean; language: string; turbo_mode: boolean }>("get_settings"),
  saveSetting: (key: string, value: string) => invoke<void>("save_setting", { key, value }),
};

export interface RefreshProgress {
  current: number;
  total: number;
  title: string;
  done: boolean;
}

export const tauriEvents = {
  onDownloadProgress: (cb: (payload: ProgressPayload) => void): Promise<UnlistenFn> =>
    listen<ProgressPayload>("download-progress", (e) => cb(e.payload)),
  onLibraryUpdated: (cb: () => void): Promise<UnlistenFn> =>
    listen("library-updated", () => cb()),
  onConversionProgress: (cb: (payload: unknown) => void): Promise<UnlistenFn> =>
    listen("conversion-progress", (e) => cb(e.payload)),
  onRefreshProgress: (cb: (payload: RefreshProgress) => void): Promise<UnlistenFn> =>
    listen<RefreshProgress>("refresh-progress", (e) => cb(e.payload)),
};
