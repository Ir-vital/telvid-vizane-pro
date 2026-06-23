import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Music, Globe, Play, Sparkles,
  Download, CheckCircle, AlertCircle, X,
} from "lucide-react";
import { useDownload } from "../hooks/useDownload";
import { useDownloadStore, type DownloadPhase } from "../stores/downloadStore";

// ─── Détection plateforme ─────────────────────────────────────────────────────
const PLATFORMS: Array<{
  test: (u: string) => boolean;
  name: string;
  color: string;
  icon: (c: string) => React.ReactNode;
}> = [
  { test: u => u.includes("youtube.com") || u.includes("youtu.be"), name: "YouTube",    color: "#ef4444", icon: c => <Play     size={16} fill={c} strokeWidth={0} /> },
  { test: u => u.includes("tiktok.com"),                             name: "TikTok",     color: "#ec4899", icon: c => <Music    size={16} color={c} /> },
  { test: u => u.includes("instagram.com"),                          name: "Instagram",  color: "#a855f7", icon: c => <Sparkles size={16} color={c} /> },
  { test: u => u.includes("twitter.com") || u.includes("x.com"),    name: "Twitter / X",color: "#38bdf8", icon: c => <Globe    size={16} color={c} /> },
  { test: u => u.includes("facebook.com"),                           name: "Facebook",   color: "#3b82f6", icon: c => <Globe    size={16} color={c} /> },
  { test: u => u.includes("twitch.tv"),                              name: "Twitch",     color: "#a78bfa", icon: c => <Play     size={16} color={c} /> },
  { test: u => u.includes("vimeo.com"),                              name: "Vimeo",      color: "#06b6d4", icon: c => <Play     size={16} color={c} /> },
  { test: u => u.startsWith("http"),                                 name: "Web",        color: "#64748b", icon: c => <Globe    size={16} color={c} /> },
];

function detectPlatform(url: string) {
  return PLATFORMS.find(p => p.test(url)) ?? null;
}

// ─── Config bouton ────────────────────────────────────────────────────────────
type BtnConfig = { label: string; icon: React.ReactNode; bg: string; shadow: string; disabled: boolean; spinning: boolean };

function getBtnConfig(phase: DownloadPhase): BtnConfig {
  switch (phase) {
    case "idle":        return { label: "Télécharger", icon: <Download size={14}/>, bg: "rgba(255,255,255,0.05)", shadow: "none", disabled: true, spinning: false };
    case "ready":       return { label: "Télécharger", icon: <Download size={14}/>, bg: "linear-gradient(135deg,#3b82f6,#6366f1)", shadow: "0 0 24px rgba(59,130,246,0.4),inset 0 1px 0 rgba(255,255,255,0.15)", disabled: false, spinning: false };
    case "analyzing":   return { label: "Analyse...",  icon: null, bg: "rgba(59,130,246,0.18)", shadow: "none", disabled: true, spinning: true };
    case "pick_format": return { label: "Format ↓",    icon: <Download size={14}/>, bg: "linear-gradient(135deg,#8b5cf6,#06b6d4)", shadow: "0 0 20px rgba(139,92,246,0.3)", disabled: true, spinning: false };
    case "downloading": return { label: "En cours...", icon: null, bg: "rgba(59,130,246,0.15)", shadow: "none", disabled: true, spinning: true };
    case "done":        return { label: "Terminé",     icon: <CheckCircle size={14}/>, bg: "rgba(52,211,153,0.18)", shadow: "0 0 20px rgba(52,211,153,0.2)", disabled: true, spinning: false };
    case "error":       return { label: "Réessayer",   icon: <AlertCircle size={14}/>, bg: "rgba(239,68,68,0.15)", shadow: "none", disabled: false, spinning: false };
  }
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      style={{ width: 14, height: 14, borderRadius: 7, flexShrink: 0, border: "2px solid rgba(255,255,255,0.18)", borderTopColor: "white" }}
    />
  );
}

// ─── Hint contextuel ──────────────────────────────────────────────────────────
const HINTS: Partial<Record<DownloadPhase, { text: string; color: string }>> = {
  idle:        { text: "Colle une URL ou glisse-la dans la fenêtre", color: "#1e293b" },
  analyzing:   { text: "Récupération des métadonnées...",            color: "#3b82f6" },
  pick_format: { text: "Choisis un format ci-dessous",               color: "#8b5cf6" },
  done:        { text: "Vidéo ajoutée à ta bibliothèque",            color: "#34d399" },
};

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar() {
  const { handleMainAction, analyzeUrl } = useDownload();
  const { currentUrl, setCurrentUrl, downloadPhase, videoInfo } = useDownloadStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [justPasted, setJustPasted] = useState(false);

  const platform = detectPlatform(currentUrl);
  const btn      = getBtnConfig(downloadPhase);
  const isBusy   = downloadPhase === "analyzing" || downloadPhase === "downloading";
  const hint     = HINTS[downloadPhase];

  // ── Gestion du submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!btn.disabled) handleMainAction();
  };

  // ── Paste intelligent : détecte URL et lance l'analyse automatiquement ──
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (!text.startsWith("http")) return;

    // On laisse React mettre à jour l'input, puis on analyse
    setJustPasted(true);
    setTimeout(() => {
      setJustPasted(false);
      analyzeUrl(text);
    }, 320); // délai court pour que l'animation "URL détectée" soit visible
  };

  // ── Drop ──
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const url = (e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")).trim();
    if (!url.startsWith("http")) return;
    setCurrentUrl(url);
    setTimeout(() => analyzeUrl(url), 120);
  };

  // ── Clear ──
  const handleClear = () => {
    setCurrentUrl("");
    inputRef.current?.focus();
  };

  // ── Couleur du ring selon la phase ──
  const ringColor =
    downloadPhase === "analyzing"   ? "rgba(59,130,246,0.55)"  :
    downloadPhase === "done"        ? "rgba(52,211,153,0.45)"  :
    downloadPhase === "error"       ? "rgba(239,68,68,0.45)"   :
    downloadPhase === "pick_format" ? "rgba(139,92,246,0.35)"  :
    justPasted                      ? "rgba(59,130,246,0.6)"   :
    currentUrl                      ? "rgba(59,130,246,0.25)"  :
    "rgba(255,255,255,0.06)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <form onSubmit={handleSubmit}>
        <motion.div
          animate={{
            boxShadow: justPasted
              ? `0 0 0 2px ${ringColor}, 0 0 48px rgba(59,130,246,0.2)`
              : `0 0 0 1px ${ringColor}, 0 6px 28px rgba(0,0,0,0.38)`,
          }}
          transition={{ duration: 0.22 }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          style={{ borderRadius: 18, background: "var(--layer-2)", border: "1px solid transparent", overflow: "hidden" }}
        >

          {/* ── Indicateur de phase en haut ── */}
          <div style={{ height: 2, background: "rgba(255,255,255,0.03)", overflow: "hidden", position: "relative" }}>
            <AnimatePresence>
              {downloadPhase === "analyzing" && (
                <motion.div key="shimmer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", inset: 0, background: "rgba(59,130,246,0.2)" }}
                >
                  <motion.div
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    style={{ height: "100%", width: "35%", background: "linear-gradient(90deg,transparent,#3b82f6,transparent)" }}
                  />
                </motion.div>
              )}
              {downloadPhase === "pick_format" && (
                <motion.div key="full" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#3b82f6,#8b5cf6,#06b6d4)", transformOrigin: "left" }}
                />
              )}
              {downloadPhase === "done" && (
                <motion.div key="done" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#34d399,#10b981)", transformOrigin: "left" }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── Corps du champ ── */}
          <div style={{ display: "flex", alignItems: "center", padding: "var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-5)", gap: 'var(--sp-4)', minHeight: 'var(--h-input)' }}>

            {/* Icône gauche — plateforme ou loupe */}
            <div style={{ flexShrink: 0, width: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AnimatePresence mode="wait">
                {platform ? (
                  <motion.div key={platform.name}
                    initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.4, rotate: 20 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  >
                    {platform.icon(platform.color)}
                  </motion.div>
                ) : (
                  <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Search size={18} color={currentUrl ? "#3b82f6" : "#334155"} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input + label plateforme */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, minWidth: 0 }}>

              {/* Label plateforme + "URL détectée" au paste */}
              <AnimatePresence>
                {(platform || justPasted) && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}
                  >
                    {justPasted && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                          color: "#34d399", background: "rgba(52,211,153,0.12)",
                          padding: "1px 6px", borderRadius: 99,
                          border: "1px solid rgba(52,211,153,0.25)",
                        }}
                      >
                        URL DÉTECTÉE
                      </motion.span>
                    )}
                    {platform && !justPasted && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: platform.color, letterSpacing: "0.05em" }}>
                        {platform.name}
                      </span>
                    )}
                    {downloadPhase === "analyzing" && (
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                        style={{ fontSize: 10, color: "#3b82f6", fontWeight: 500 }}
                      >
                        Analyse en cours...
                      </motion.span>
                    )}
                    {downloadPhase === "pick_format" && videoInfo && (
                      <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 500 }}>
                        Prêt · {videoInfo.title.slice(0, 40)}{videoInfo.title.length > 40 ? "…" : ""}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                ref={inputRef}
                type="text"
                value={currentUrl}
                onChange={e => setCurrentUrl(e.target.value)}
                onPaste={handlePaste}
                placeholder="Coller une URL ou glisser ici..."
                disabled={isBusy}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  color: currentUrl ? "#f1f5f9" : "#334155",
                  fontSize: 14, width: "100%",
                  caretColor: "#3b82f6",
                  cursor: isBusy ? "not-allowed" : "text",
                  opacity: isBusy ? 0.55 : 1,
                  transition: "opacity 0.2s",
                }}
              />
            </div>

            {/* Bouton clear — apparaît quand il y a une URL et qu'on n'est pas en cours */}
            <AnimatePresence>
              {currentUrl && !isBusy && downloadPhase !== "done" && (
                <motion.button
                  key="clear"
                  type="button"
                  onClick={handleClear}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    flexShrink: 0, background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, cursor: "pointer", color: "#475569",
                    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#475569"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                >
                  <X size={12} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Bouton principal */}
            <motion.button
              type="submit"
              disabled={btn.disabled}
              whileHover={{ scale: btn.disabled ? 1 : 1.03 }}
              whileTap={{ scale: btn.disabled ? 1 : 0.97 }}
              layout
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
                padding: "0 var(--sp-6)", height: 'var(--h-btn)', borderRadius: 'var(--r-md)',
                fontSize: 13, fontWeight: 600, border: "none",
                cursor: btn.disabled ? "not-allowed" : "pointer",
                background: btn.bg,
                color: downloadPhase === "idle" ? "#334155" : "white",
                boxShadow: btn.shadow,
                transition: "background 0.28s, box-shadow 0.28s, color 0.2s",
                minWidth: 148, justifyContent: "center",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={downloadPhase}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.16 }}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  {btn.spinning ? <Spinner /> : btn.icon}
                  {btn.label}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </form>

      {/* Hint contextuel */}
      <AnimatePresence mode="wait">
        {hint && (
          <motion.p
            key={downloadPhase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{ textAlign: "center", fontSize: 11, color: hint.color, margin: 0 }}
          >
            {hint.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
