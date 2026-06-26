import { useEffect, useCallback } from "react";
import { tauriApi } from "../lib/tauri";
import { useDownloadStore } from "../stores/downloadStore";

export function usePremium() {
  const { premium, setPremium } = useDownloadStore();

  // Charge le statut Premium au démarrage
  useEffect(() => {
    tauriApi.checkPremiumStatus().then(setPremium).catch(console.error);
  }, []);

  // Fonction pour recharger le statut (appelée après activation)
  const refreshPremium = useCallback(async () => {
    try {
      const status = await tauriApi.checkPremiumStatus();
      setPremium(status);
      return status;
    } catch (e) {
      console.error("Failed to refresh premium status:", e);
      throw e;
    }
  }, [setPremium]);

  return { premium, refreshPremium };
}
