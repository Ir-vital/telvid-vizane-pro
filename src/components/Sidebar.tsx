import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Library, Wrench, Play, FolderOpen, Trash2, Film, Music2, Video, RefreshCw, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDownloadStore } from "../stores/downloadStore";
import { useLibrary } from "../hooks/useLibrary";
import { VideoPlayer } from "./VideoPlayer";
import { Converter } from "./Converter";
import type { DownloadedVideo } from "../lib/tauri";
import { tauriApi, tauriEvents, type RefreshProgress } from "../lib/tauri";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(s: number): string {
  if (!s || s <= 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtSize(mb: number): string {
  if (!mb || mb <= 0) return "";
  if (mb < 1000) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function cleanTitle(raw: string): string {
  if (!raw) return "Vidéo sans titre";
  try { if (raw.startsWith("http")) return new URL(raw).hostname.replace("www.", ""); }
  catch { /* not a URL */ }
  return raw;
}

function cleanPlatform(p: string): string | null {
  if (!p || p === "unknown" || p === "other" || p === "") return null;
  return p.charAt(0).toUpperCase() + p.slice(1);
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#ef4444", tiktok: "#ec4899", instagram: "#a855f7",
  twitter: "#38bdf8", facebook: "#3b82f6", twitch: "#a78bfa",
  vimeo: "#06b6d4", dailymotion: "#f59e0b",
};

function platformColor(p: string): string {
  return PLATFORM_COLORS[p.toLowerCase()] ?? "#64748b";
}

function thumbnailSrc(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `asset://localhost/${path.replace(/\\/g, "/")}`;
}

// ─── VideoCard ────────────────────────────────────────────────────────────────

function VideoCard({ video, onPlay, onOpenFolder, onDelete }: {
  video: DownloadedVideo;
  onPlay: () => void;
  onOpenFolder: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [imgError, setImgError] = useState(false);

  const title    = cleanTitle(video.title);
  const platform = cleanPlatform(video.platform);
  const isAudio  = video.format === "mp3";
  const duration = fmtDuration(video.duration_seconds);
  const size     = fmtSize(video.file_size_mb);
  const date     = fmtDate(video.downloaded_at);
  const pColor   = platform ? platformColor(video.platform) : "#64748b";
  const uploader = video.uploader?.trim() || null;
  const quality  = video.quality?.trim() || null;
  const thumb    = thumbnailSrc(video.thumbnail_path);
  const hasThumb = !!thumb && !imgError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setAskDelete(false); }}
      style={{
        borderRadius: 20, overflow: "hidden",
        background: hovered ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.028)",
        border: hovered ? "1px solid rgba(59,130,246,0.28)" : "1px solid rgba(255,255,255,0.08)",
        boxShadow: hovered
          ? "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)"
          : "0 2px 16px rgba(0,0,0,0.3)",
        transition: "background 0.2s, border-color 0.2s, box-shadow 0.25s",
      }}
    >
      {/* ── Thumbnail ── */}
      <div style={{
        position: "relative", width: "100%", height: 190, overflow: "hidden",
        background: isAudio
          ? "linear-gradient(135deg, #1a0e3a 0%, #0c1628 100%)"
          : "#040c1a",
      }}>
        {hasThumb ? (
          <motion.img
            src={thumb}
            alt={title}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            {isAudio
              ? <Music2 size={48} color="rgba(139,92,246,0.3)" />
              : <Film   size={48} color="rgba(255,255,255,0.06)" />
            }
            {platform && (
              <span style={{ fontSize: 11, color: pColor, fontWeight: 600, opacity: 0.6 }}>
                {platform}
              </span>
            )}
          </div>
        )}

        {/* Gradient overlay — plus profond en bas */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(3,8,20,0.95) 0%, rgba(3,8,20,0.3) 40%, transparent 70%)",
        }} />

        {/* Bouton play central au hover */}
        <AnimatePresence>
          {hovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.65 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.65 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              onClick={onPlay}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.22)", border: "none", cursor: "pointer",
              }}
            >
              <div style={{
                width: 54, height: 54, borderRadius: 27,
                background: "rgba(59,130,246,0.95)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 12px rgba(59,130,246,0.14), 0 0 40px rgba(59,130,246,0.55)",
              }}>
                <Play size={22} color="white" fill="white" />
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Badge format — haut gauche */}
        <div style={{
          position: "absolute", top: 11, left: 11,
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 99,
          background: isAudio ? "rgba(139,92,246,0.92)" : "rgba(59,130,246,0.92)",
          backdropFilter: "blur(8px)",
          boxShadow: isAudio ? "0 2px 8px rgba(139,92,246,0.4)" : "0 2px 8px rgba(59,130,246,0.4)",
        }}>
          {isAudio ? <Music2 size={9} color="white" /> : <Video size={9} color="white" />}
          <span style={{ fontSize: 9, fontWeight: 800, color: "white", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {video.format || "mp4"}
          </span>
        </div>

        {/* Qualité — haut droite */}
        {quality && (
          <div style={{
            position: "absolute", top: 11, right: 11,
            padding: "4px 9px", borderRadius: 99,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>
              {quality}
            </span>
          </div>
        )}

        {/* Durée — bas droite */}
        {duration && (
          <span style={{
            position: "absolute", bottom: 11, right: 11,
            fontSize: 11, fontWeight: 700,
            background: "rgba(0,0,0,0.8)", color: "#f1f5f9",
            padding: "3px 9px", borderRadius: 8,
            backdropFilter: "blur(6px)",
            letterSpacing: "0.02em",
          }}>
            {duration}
          </span>
        )}

        {/* Plateforme — bas gauche */}
        {platform && (
          <span style={{
            position: "absolute", bottom: 11, left: 11,
            fontSize: 10, fontWeight: 700,
            color: pColor,
            background: "rgba(0,0,0,0.72)",
            padding: "3px 9px", borderRadius: 8,
            backdropFilter: "blur(6px)",
          }}>
            {platform}
          </span>
        )}
      </div>

      {/* ── Infos ── */}
      <div style={{ padding: "16px 18px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Titre */}
        <p style={{
          fontSize: 14, fontWeight: 600, color: "#f1f5f9",
          lineHeight: 1.4, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {title}
        </p>

        {/* Auteur */}
        {uploader && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9,
              background: `${pColor}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: pColor }}>
                {uploader.charAt(0).toUpperCase()}
              </span>
            </div>
            <span style={{
              fontSize: 12, color: "#64748b", fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {uploader}
            </span>
          </div>
        )}

        {/* Méta pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {size && (
            <span style={{
              fontSize: 10, fontWeight: 500, color: "#475569",
              background: "rgba(255,255,255,0.05)",
              padding: "3px 9px", borderRadius: 99,
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              {size}
            </span>
          )}
          {date && (
            <span style={{ fontSize: 10, color: "#334155" }}>{date}</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}>

          {/* Lire — bouton principal */}
          <button
            onClick={onPlay}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px 0", borderRadius: 11,
              fontSize: 13, fontWeight: 600,
              background: "rgba(59,130,246,0.14)", color: "#3b82f6",
              border: "1px solid rgba(59,130,246,0.28)", cursor: "pointer",
              transition: "all 0.18s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.26)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.5)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(59,130,246,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(59,130,246,0.14)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.28)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            <Play size={12} fill="#3b82f6" strokeWidth={0} />
            Lire
          </button>

          {/* Ouvrir dossier */}
          <button
            onClick={onOpenFolder}
            title="Ouvrir le dossier"
            style={{
              width: 40, height: 40, borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)", color: "#475569",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.18s", flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#475569";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
            }}
          >
            <FolderOpen size={15} />
          </button>

          {/* Supprimer avec confirmation */}
          {askDelete ? (
            <motion.button
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              onClick={() => { onDelete(); setAskDelete(false); }}
              style={{
                width: 40, height: 40, borderRadius: 11,
                border: "1px solid rgba(239,68,68,0.5)",
                background: "rgba(239,68,68,0.18)", color: "#f87171",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, fontSize: 10, fontWeight: 800,
              }}
            >
              ✓
            </motion.button>
          ) : (
            <button
              onClick={() => setAskDelete(true)}
              title="Supprimer"
              style={{
                width: 40, height: 40, borderRadius: 11,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)", color: "#475569",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.18s", flexShrink: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.3)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "#475569";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyLibrary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingTop: 72, paddingBottom: 40, gap: 20,
        textAlign: "center",
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Film size={32} color="rgba(255,255,255,0.1)" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#334155", margin: 0 }}>
          Bibliothèque vide
        </p>
        <p style={{ fontSize: 12, color: "#1e293b", margin: 0, lineHeight: 1.6, maxWidth: 220 }}>
          Télécharge ta première vidéo pour la voir apparaître ici
        </p>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 99,
        background: "rgba(59,130,246,0.08)",
        border: "1px solid rgba(59,130,246,0.15)",
      }}>
        <Download size={12} color="#3b82f6" />
        <span style={{ fontSize: 11, color: "#3b82f6", fontWeight: 500 }}>
          Colle une URL dans la barre de recherche
        </span>
      </div>
    </motion.div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarTab, setSidebarTab, playerVideo } = useDownloadStore();
  const { library, deleteVideo, openFolder, refresh } = useLibrary();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<RefreshProgress | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    tauriEvents.onRefreshProgress((p) => {
      setRefreshStatus(p);
      if (p.done) {
        setTimeout(() => { setRefreshStatus(null); setRefreshing(false); }, 2500);
        refresh();
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshStatus(null);
    try {
      await tauriApi.refreshLibraryMetadata();
    } catch {
      setRefreshing(false);
      setRefreshStatus(null);
    }
  };

  return (
    <aside
      className="sidebar-bg"
      style={{
        width: 360, flexShrink: 0,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "-4px 0 32px rgba(0,0,0,0.35)",
      }}
    >
      {/* Tabs */}
      <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {[
          { key: "library",   icon: <Library size={13} />, label: t("library.title"),   color: "#3b82f6" },
          { key: "converter", icon: <Wrench  size={13} />, label: t("converter.title"), color: "#8b5cf6" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSidebarTab(tab.key as "library" | "converter")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 7, padding: "14px 0", fontSize: 12, fontWeight: 500,
              cursor: "pointer", border: "none", outline: "none",
              color: sidebarTab === tab.key ? tab.color : "#475569",
              borderBottom: sidebarTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
              background: sidebarTab === tab.key ? "rgba(255,255,255,0.025)" : "transparent",
              transition: "all 0.2s",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px 32px 14px" }}>
        {sidebarTab === "library" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {playerVideo && <VideoPlayer />}

            {/* Header bibliothèque */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                {library.length > 0 ? `${library.length} vidéo${library.length > 1 ? "s" : ""}` : "Bibliothèque"}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: refreshing ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)",
                  color: refreshing ? "#3b82f6" : "#475569",
                  fontSize: 11, fontWeight: 500,
                  cursor: refreshing ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { if (!refreshing) { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; } }}
                onMouseLeave={e => { if (!refreshing) { (e.currentTarget as HTMLButtonElement).style.color = "#475569"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; } }}
              >
                <motion.div
                  animate={{ rotate: refreshing ? 360 : 0 }}
                  transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
                >
                  <RefreshCw size={12} />
                </motion.div>
                Actualiser
              </button>
            </div>

            {/* Barre de progression refresh */}
            <AnimatePresence>
              {refreshStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div
                      animate={{ width: refreshStatus.total > 0 ? `${(refreshStatus.current / refreshStatus.total) * 100}%` : "100%" }}
                      transition={{ duration: 0.4 }}
                      style={{
                        height: "100%", borderRadius: 99,
                        background: refreshStatus.done
                          ? "linear-gradient(90deg,#34d399,#10b981)"
                          : "linear-gradient(90deg,#3b82f6,#8b5cf6)",
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 10, color: refreshStatus.done ? "#34d399" : "#3b82f6", margin: 0, textAlign: "center" }}>
                    {refreshStatus.title}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cards ou empty state */}
            {library.length === 0 ? (
              <EmptyLibrary />
            ) : (
              <AnimatePresence>
                {library.map((video, i) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 24 }}
                  >
                    <VideoCard
                      video={video}
                      onPlay={() => tauriApi.openFile(video.file_path)}
                      onOpenFolder={() => openFolder(video.file_path)}
                      onDelete={() => deleteVideo(video.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        ) : (
          <Converter />
        )}
      </div>
    </aside>
  );
}
