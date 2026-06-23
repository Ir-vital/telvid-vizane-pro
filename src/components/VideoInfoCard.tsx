import { motion } from "framer-motion";
import { Clock, Globe } from "lucide-react";
import { useDownloadStore } from "../stores/downloadStore";
import { FormatPicker } from "./FormatPicker";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoInfoCard() {
  const { videoInfo, analyzeError } = useDownloadStore();

  if (analyzeError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 'var(--sp-4) var(--sp-5)',
          borderRadius: 'var(--r-md)',
          background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 13, lineHeight: 1.6,
          boxShadow: '0 4px 16px rgba(239,68,68,0.1)',
        }}
      >
        {analyzeError}
      </motion.div>
    );
  }

  if (!videoInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      style={{
        borderRadius: 'var(--r-xl)', overflow: 'hidden',
        background: 'var(--layer-2)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 32px rgba(0,0,0,0.45)',
      }}
    >
      {/* ── Thumbnail + infos ── */}
      <div style={{ display: 'flex', gap: 'var(--sp-5)', padding: 'var(--sp-5) var(--sp-6)' }}>
        {videoInfo.thumbnail && (
          <div style={{
            position: 'relative', flexShrink: 0,
            width: 176, height: 104,
            borderRadius: 'var(--r-md)', overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            <img
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />
            {videoInfo.duration_seconds > 0 && (
              <span style={{
                position: 'absolute', bottom: 8, right: 8,
                fontSize: 10, fontWeight: 700,
                background: 'rgba(0,0,0,0.82)', color: '#e2e8f0',
                padding: '3px 8px', borderRadius: 'var(--r-sm)',
                backdropFilter: 'blur(4px)',
              }}>
                {formatDuration(videoInfo.duration_seconds)}
              </span>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', justifyContent: 'center' }}>
          <h3 style={{
            fontSize: 15, fontWeight: 600, color: '#f1f5f9',
            lineHeight: 1.45, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {videoInfo.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-1)',
              fontSize: 11, color: '#3b82f6',
              background: 'rgba(59,130,246,0.1)',
              padding: '4px 10px', borderRadius: 'var(--r-pill)',
              border: '1px solid rgba(59,130,246,0.2)',
              fontWeight: 500, textTransform: 'capitalize',
            }}>
              <Globe size={10} />
              {videoInfo.platform}
            </span>
            {videoInfo.duration_seconds > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', fontSize: 11, color: '#475569' }}>
                <Clock size={11} />
                {formatDuration(videoInfo.duration_seconds)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divider" style={{ margin: '0 var(--sp-6)' }} />

      <div style={{ padding: 'var(--sp-5) var(--sp-6) var(--sp-6) var(--sp-6)', background: 'rgba(0,0,0,0.12)' }}>
        <FormatPicker />
      </div>
    </motion.div>
  );
}
