import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Film, Zap, Music2, Video, Clock, Wifi } from "lucide-react";
import { useDownloadStore, type ActiveDownload } from "../stores/downloadStore";
import { tauriApi } from "../lib/tauri";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSpeed(mbps: number): string {
  if (!mbps || mbps <= 0) return "";
  if (mbps < 1) return `${(mbps * 1000).toFixed(0)} KB/s`;
  return `${mbps.toFixed(1)} MB/s`;
}

function fmtEta(s: number): string {
  if (!s || s <= 0) return "";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

// ─── Couleurs et styles selon l'état ─────────────────────────────────────────

type StatusTheme = {
  bar: string;
  glow: string;
  text: string;
  bg: string;
  border: string;
};

function getTheme(status: string): StatusTheme {
  if (status === "done")
    return { bar: "linear-gradient(90deg,#34d399,#10b981)", glow: "rgba(52,211,153,0.35)", text: "#34d399", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.18)" };
  if (status.startsWith("error"))
    return { bar: "linear-gradient(90deg,#f87171,#ef4444)", glow: "rgba(248,113,113,0.35)", text: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.18)" };
  if (status === "converting")
    return { bar: "linear-gradient(90deg,#f59e0b,#f97316)", glow: "rgba(245,158,11,0.35)", text: "#f59e0b", bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.15)" };
  // downloading / queued
  return { bar: "linear-gradient(90deg,#3b82f6,#8b5cf6,#06b6d4)", glow: "rgba(59,130,246,0.35)", text: "#3b82f6", bg: "rgba(59,130,246,0.05)", border: "rgba(59,130,246,0.15)" };
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
      style={{
        width: size, height: size, borderRadius: size / 2, flexShrink: 0,
        border: `2px solid ${color}28`, borderTopColor: color,
      }}
    />
  );
}

// ─── Card de téléchargement ───────────────────────────────────────────────────

function DownloadCard({ dl }: { dl: ActiveDownload }) {
  const { removeDownload } = useDownloadStore();
  const [hovered, setHovered] = useState(false);

  const isDone    = dl.status === "done";
  const isError   = dl.status.startsWith("error");
  const isConv    = dl.status === "converting";
  const isBusy    = !isDone && !isError;
  const theme     = getTheme(dl.status);
  const label     = dl.status_label || dl.status;
  const speed     = fmtSpeed(dl.speed_mbps);
  const eta       = fmtEta(dl.eta_seconds);
  const isAudio   = dl.format === "mp3";

  const handleCancel = () => {
    tauriApi.cancelDownload(dl.id).catch(console.error);
    removeDownload(dl.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18, overflow: "hidden",
        background: hovered ? "var(--layer-3)" : "var(--layer-2)",
        border: `1px solid ${hovered ? theme.border : "rgba(255,255,255,0.07)"}`,
        boxShadow: isDone
          ? `0 0 0 1px ${theme.border}, 0 6px 24px rgba(0,0,0,0.35)`
          : isError
          ? `0 0 0 1px ${theme.border}, 0 6px 24px rgba(0,0,0,0.35)`
          : `0 6px 24px rgba(0,0,0,0.3)`,
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* ── Barre de progression top — fine et lumineuse ── */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${dl.percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ height: "100%", background: theme.bar, boxShadow: `0 0 10px ${theme.glow}` }}
        />
        {/* Shimmer animé pendant le téléchargement actif */}
        {isBusy && dl.percent > 2 && dl.percent < 98 && (
          <motion.div
            animate={{ x: ["-100%", "500%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
            style={{
              position: "absolute", top: 0, left: 0,
              width: "20%", height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            }}
          />
        )}
      </div>

      {/* ── Corps ── */}
      <div style={{ padding: "14px 16px 16px 16px" }}>

        {/* Ligne 1 : miniature + titre + fermer */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>

          {/* Miniature */}
          <div style={{
            flexShrink: 0, width: 76, height: 52, borderRadius: 10,
            overflow: "hidden", position: "relative",
            background: isAudio ? "linear-gradient(135deg,#1a0e3a,#0c1628)" : "#040c1a",
          }}>
            {dl.thumbnail ? (
              <img
                src={dl.thumbnail}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isAudio ? <Music2 size={20} color="rgba(139,92,246,0.4)" /> : <Film size={20} color="rgba(255,255,255,0.1)" />}
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)" }} />
            {/* Badge format */}
            <span style={{
              position: "absolute", bottom: 4, left: 4,
              fontSize: 8, fontWeight: 800, textTransform: "uppercase",
              background: isAudio ? "rgba(139,92,246,0.92)" : "rgba(59,130,246,0.92)",
              color: "white", padding: "1px 5px", borderRadius: 4,
              letterSpacing: "0.05em",
            }}>
              {dl.format || "mp4"}
            </span>
          </div>

          {/* Titre + bouton fermer */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 600, color: "#e2e8f0",
                lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>
                {dl.title}
              </span>
              <button
                onClick={handleCancel}
                style={{
                  flexShrink: 0, background: "none", border: "none",
                  cursor: "pointer", color: "#334155", padding: "2px",
                  display: "flex", borderRadius: 5, transition: "color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={e => (e.currentTarget.style.color = "#334155")}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Ligne 2 : état + métriques */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>

          {/* État avec icône */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isDone  && <CheckCircle size={12} color={theme.text} />}
            {isError && <AlertCircle size={12} color={theme.text} />}
            {isConv  && <Zap size={12} color={theme.text} />}
            {isBusy && !isConv && <Spinner color={theme.text} />}
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>
              {label}
            </span>
          </div>

          {/* Métriques droite */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {speed && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Wifi size={10} color="#475569" />
                <span style={{ fontSize: 11, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
                  {speed}
                </span>
              </div>
            )}
            {eta && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={10} color="#334155" />
                <span style={{ fontSize: 11, color: "#334155", fontVariantNumeric: "tabular-nums" }}>
                  {eta}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ligne 3 : barre de progression principale + % */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            flex: 1, height: 6, borderRadius: 99,
            background: "rgba(255,255,255,0.05)",
            overflow: "hidden", position: "relative",
          }}>
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${dl.percent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                height: "100%", borderRadius: 99,
                background: theme.bar,
                boxShadow: dl.percent > 0 ? `0 0 8px ${theme.glow}` : "none",
              }}
            />
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, color: theme.text,
            minWidth: 36, textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}>
            {dl.percent.toFixed(0)}%
          </span>
        </div>

      </div>
    </motion.div>
  );
}

// ─── DownloadQueue ────────────────────────────────────────────────────────────

export function DownloadQueue() {
  const { activeDownloads } = useDownloadStore();

  if (activeDownloads.length === 0) return null;

  const queued   = activeDownloads.filter(d => d.status === "queued");
  const active   = activeDownloads.filter(d => d.status === "downloading" || d.status === "converting");
  const finished = activeDownloads.filter(d => d.status === "done" || d.status.startsWith("error"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: "#334155",
          textTransform: "uppercase", letterSpacing: "0.09em", margin: 0,
        }}>
          Téléchargements
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {active.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", background: "rgba(59,130,246,0.12)", padding: "2px 9px", borderRadius: 99, border: "1px solid rgba(59,130,246,0.22)" }}>
              {active.length} actif{active.length > 1 ? "s" : ""}
            </span>
          )}
          {queued.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "rgba(255,255,255,0.06)", padding: "2px 9px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)" }}>
              {queued.length} en attente
            </span>
          )}
          {finished.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.1)", padding: "2px 9px", borderRadius: 99, border: "1px solid rgba(52,211,153,0.2)" }}>
              {finished.length} terminé{finished.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Cards actives en premier */}
      <AnimatePresence>
        {[...active, ...queued, ...finished].map((dl) => (
          <DownloadCard key={dl.id} dl={dl} />
        ))}
      </AnimatePresence>
    </div>
  );
}
