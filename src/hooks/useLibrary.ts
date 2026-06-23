import { useEffect } from "react";
import { tauriApi, tauriEvents } from "../lib/tauri";
import { useDownloadStore } from "../stores/downloadStore";

export function useLibrary() {
  const { setLibrary, library } = useDownloadStore();

  const refresh = async () => {
    try {
      const videos = await tauriApi.getLibrary();
      setLibrary(videos);
    } catch (e) {
      console.error("Failed to load library:", e);
    }
  };

  useEffect(() => {
    refresh();
    let unlisten: (() => void) | null = null;
    tauriEvents.onLibraryUpdated(refresh).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  const deleteVideo = async (id: string) => {
    await tauriApi.deleteVideo(id);
    await refresh();
  };

  const openFile = (path: string) => tauriApi.openFile(path);
  const openFolder = (path: string) => tauriApi.openFolder(path);

  return { library, refresh, deleteVideo, openFile, openFolder };
}
