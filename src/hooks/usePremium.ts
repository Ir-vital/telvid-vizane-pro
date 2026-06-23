import { useEffect } from "react";
import { tauriApi } from "../lib/tauri";
import { useDownloadStore } from "../stores/downloadStore";

export function usePremium() {
  const { premium, setPremium } = useDownloadStore();

  useEffect(() => {
    tauriApi.checkPremiumStatus().then(setPremium).catch(console.error);
  }, []);

  return { premium };
}
