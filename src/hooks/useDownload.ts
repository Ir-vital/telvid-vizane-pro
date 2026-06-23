import { useEffect } from "react";
import { tauriApi, tauriEvents } from "../lib/tauri";
import { useDownloadStore } from "../stores/downloadStore";
import { useTranslation } from "react-i18next";

export function useDownload() {
  const { t } = useTranslation();
  const {
    setVideoInfo, setIsAnalyzing, setAnalyzeError,
    setDownloadPhase, addDownload, updateDownloadProgress,
    removeDownload, outputPath, turboMode, premium, addToast,
  } = useDownloadStore();

  // Écoute les events de progression
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    tauriEvents.onDownloadProgress((payload) => {
      updateDownloadProgress(payload);
      if (payload.status === "done") {
        setDownloadPhase("done");
        addToast({ message: "Téléchargement terminé — vidéo ajoutée à la bibliothèque", type: "success" });
        setTimeout(() => removeDownload(payload.download_id), 3000);
        setTimeout(() => setDownloadPhase("ready"), 4000);
      } else if (payload.status.startsWith("error")) {
        setDownloadPhase("error");
        const raw = payload.status.replace("error:", "").trim().toLowerCase();
        let human = "Le téléchargement a échoué.";
        if (raw.includes("network") || raw.includes("connection"))
          human = "Connexion interrompue. Vérifiez votre réseau.";
        else if (raw.includes("ffmpeg"))
          human = "Erreur de conversion. FFmpeg est-il installé ?";
        else if (raw.includes("introuvable") || raw.includes("not found"))
          human = "Fichier introuvable après téléchargement.";
        addToast({ message: human, type: "error" });
        setTimeout(() => setDownloadPhase("ready"), 4000);
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // Analyse seule (utilisée en interne)
  const analyzeUrl = async (url: string) => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setVideoInfo(null);
    setDownloadPhase("analyzing");
    try {
      const info = await tauriApi.getVideoInfo(url);
      setVideoInfo(info);
      setDownloadPhase("pick_format");
    } catch (e) {
      const raw = String(e).toLowerCase();
      let human = "Impossible de récupérer cette vidéo.";
      if (raw.includes("not found") || raw.includes("404"))
        human = "Cette vidéo est introuvable ou a été supprimée.";
      else if (raw.includes("private") || raw.includes("unavailable"))
        human = "Cette vidéo est privée ou indisponible.";
      else if (raw.includes("network") || raw.includes("connection") || raw.includes("timeout"))
        human = "Problème de connexion. Vérifiez votre réseau.";
      else if (raw.includes("yt-dlp") || raw.includes("introuvable"))
        human = "yt-dlp n'est pas installé. Installez-le via winget install yt-dlp.";
      else if (raw.includes("unsupported"))
        human = "Cette plateforme n'est pas encore supportée.";
      setAnalyzeError(human);
      setDownloadPhase("error");
      setTimeout(() => setDownloadPhase("ready"), 4000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Action principale du bouton unique
  const handleMainAction = async () => {
    const { currentUrl, downloadPhase, videoInfo } = useDownloadStore.getState();

    if (downloadPhase === "ready") {
      // Étape 1 : analyser
      await analyzeUrl(currentUrl);
      return;
    }

    if (downloadPhase === "pick_format") {
      // pick_format est géré par FormatPicker directement
      return;
    }
  };

  // Lancement du téléchargement depuis FormatPicker
  const startDownload = async (formatId: string, extractAudio = false) => {
    const { videoInfo, currentUrl } = useDownloadStore.getState();
    if (!videoInfo || !currentUrl) return;

    if (formatId.includes("1080") && !premium?.is_premium) {
      addToast({ message: t("premium.limit_480p"), type: "error" });
      return;
    }

    const downloadPath = outputPath || await tauriApi.getDownloadDir().catch(() => ".");
    setDownloadPhase("downloading");

    // Détermine la qualité lisible
    const quality = extractAudio ? "320kbps" : formatId.includes("1080") ? "1080p" : "480p";

    try {
      const id = await tauriApi.startDownload({
        url: currentUrl,
        format_id: formatId,
        output_path: downloadPath,
        priority: 3,
        turbo_mode: turboMode && (premium?.turbo_mode ?? false),
        auto_convert_mp4: !extractAudio,
        extract_audio: extractAudio,
        // Métadonnées réelles pour l'insert en base
        title: videoInfo.title,
        uploader: videoInfo.uploader,
        thumbnail: videoInfo.thumbnail,
        duration_seconds: videoInfo.duration_seconds,
        platform: videoInfo.platform,
        quality,
      });

      addDownload({
        id,
        title: videoInfo.title,
        url: currentUrl,
        thumbnail: videoInfo.thumbnail,
        format: extractAudio ? "mp3" : "mp4",
        percent: 0,
        speed_mbps: 0,
        eta_seconds: 0,
        status: "queued",
        status_label: "En attente...",
      });
    } catch (e) {
      addToast({ message: String(e), type: "error" });
      setDownloadPhase("pick_format");
    }
  };

  return { analyzeUrl, handleMainAction, startDownload };
}
