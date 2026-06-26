import { useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Settings2 } from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { VideoInfoCard } from "./components/VideoInfoCard";
import { DownloadQueue } from "./components/DownloadQueue";
import { Sidebar } from "./components/Sidebar";
import { NotificationToast } from "./components/NotificationToast";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { Settings } from "./components/Settings";
import { PremiumBanner } from "./components/PremiumBanner";
import { PremiumModal } from "./components/PremiumModal";
import { useDownloadStore } from "./stores/downloadStore";
import { useDownload } from "./hooks/useDownload";
import { usePremium } from "./hooks/usePremium";
import { tauriApi } from "./lib/tauri";

function PremiumBadge() {
  const { premium, setPremiumOpen } = useDownloadStore();
  if (!premium) return null;
  return (
    <button
      onClick={() => !premium.is_premium && setPremiumOpen(true)}
      style={{
        ...(premium.is_premium
          ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', cursor: 'default' }
          : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }
        ),
        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
        letterSpacing: '0.05em', transition: 'all 0.18s',
      }}
      onMouseEnter={e => { if (!premium.is_premium) { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'; } }}
      onMouseLeave={e => { if (!premium.is_premium) { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; } }}
    >
      {premium.is_premium ? "⚡ PREMIUM" : "FREE"}
    </button>
  );
}

export default function App() {
  const { setCurrentUrl, setOutputPath, setSettingsOpen } = useDownloadStore();
  const { analyzeUrl } = useDownload();
  
  // Charge le statut Premium au démarrage
  usePremium();

  // Charge le dossier de téléchargement au démarrage
  useEffect(() => {
    tauriApi.getDownloadDir().then(setOutputPath).catch(console.error);
  }, []);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const url = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain");
      if (url && url.startsWith("http")) { setCurrentUrl(url); analyzeUrl(url); }
    };
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => { window.removeEventListener("dragover", handleDragOver); window.removeEventListener("drop", handleDrop); };
  }, []);

  return (
    <div className="app-bg" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header
        className="glass-header"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 var(--sp-8)', height: 'var(--h-header)', flexShrink: 0, zIndex: 10,
          boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--r-sm)', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            boxShadow: '0 0 0 1px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Download size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            TelVid<span style={{ color: '#3b82f6' }}>-</span>Vizane
          </span>
          <PremiumBadge />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSwitcher />
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              color: "#64748b", cursor: "pointer", transition: "all 0.18s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
          >
            <Settings2 size={13} />
            Paramètres
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Zone principale ── */}
        <main style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 'var(--sp-12) var(--sp-10)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
            style={{ width: '100%', maxWidth: 660, display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}
          >
            {/* ── Hero ── */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <h1 style={{
                fontSize: 32, fontWeight: 800, lineHeight: 1.2, margin: 0,
                color: '#f8fafc', letterSpacing: '-0.03em',
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}>
                Téléchargez{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))',
                }}>
                  n'importe quelle vidéo
                </span>
              </h1>
              <p style={{ fontSize: 13, color: '#334155', margin: 0, letterSpacing: '0.02em' }}>
                YouTube · TikTok · Instagram · Facebook · Twitter · Twitch · Vimeo
              </p>
            </div>

            <SearchBar />
            <PremiumBanner />
            <VideoInfoCard />
            <DownloadQueue />
          </motion.div>
        </main>

        <Sidebar />
      </div>

      <NotificationToast />
      <Settings />
      <PremiumModal />
    </div>
  );
}
