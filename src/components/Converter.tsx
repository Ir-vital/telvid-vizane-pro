import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileVideo, Music, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { tauriApi, tauriEvents } from "../lib/tauri";
import { useDownloadStore } from "../stores/downloadStore";

type ConvertMode = "mp4" | "mp3";
type AudioQuality = 128 | 192 | 320;

export function Converter() {
  const { t } = useTranslation();
  const { addToast } = useDownloadStore();
  const [isDragging, setIsDragging] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [mode, setMode] = useState<ConvertMode>("mp4");
  const [quality, setQuality] = useState<AudioQuality>(320);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFilePath((file as File & { path?: string }).path || file.name);
  };

  const handleConvert = async () => {
    if (!filePath) return;
    setConverting(true);
    setProgress(0);
    const unlisten = await tauriEvents.onConversionProgress((payload: unknown) => {
      const p = payload as { percent?: number };
      if (p.percent !== undefined) setProgress(p.percent);
    });
    try {
      mode === "mp4"
        ? await tauriApi.convertToMp4(filePath)
        : await tauriApi.extractAudio(filePath, quality);
      addToast({ message: t("notifications.conversion_complete"), type: "success" });
      setFilePath(null);
      setProgress(0);
    } catch (e) {
      addToast({ message: String(e), type: "error" });
    } finally {
      setConverting(false);
      unlisten();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-8) var(--sp-5)',
          borderRadius: 'var(--r-lg)', cursor: 'pointer',
          border: isDragging ? '2px dashed #3b82f6' : '2px dashed rgba(255,255,255,0.09)',
          background: isDragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
          boxShadow: isDragging ? '0 0 24px rgba(59,130,246,0.18)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef} type="file" accept="video/*,audio/*" style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFilePath((f as File & { path?: string }).path || f.name);
          }}
        />
        <Upload size={24} color={isDragging ? '#3b82f6' : '#334155'} />
        <p style={{ fontSize: 12, color: '#475569', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          {filePath
            ? <span style={{ color: '#94a3b8', fontWeight: 500 }}>{filePath.split(/[\\/]/).pop()}</span>
            : t("converter.drop_hint")
          }
        </p>
      </div>

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        {(["mp4", "mp3"] as ConvertMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'var(--sp-2)', padding: 'var(--sp-3) 0',
              borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.18s',
              background: mode === m
                ? (m === "mp4" ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)')
                : 'rgba(255,255,255,0.04)',
              border: mode === m
                ? (m === "mp4" ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(139,92,246,0.4)')
                : '1px solid rgba(255,255,255,0.07)',
              color: mode === m ? (m === "mp4" ? '#3b82f6' : '#8b5cf6') : '#475569',
            }}
          >
            {m === "mp4" ? <FileVideo size={14} /> : <Music size={14} />}
            {m === "mp4" ? t("converter.to_mp4") : t("converter.to_mp3")}
          </button>
        ))}
      </div>

      {/* Quality (MP3 only) */}
      <AnimatePresence>
        {mode === "mp3" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', gap: 'var(--sp-2)' }}
          >
            {([128, 192, 320] as AudioQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                style={{
                  flex: 1, padding: 'var(--sp-2) 0',
                  borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.18s',
                  background: quality === q ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: quality === q ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  color: quality === q ? '#8b5cf6' : '#475569',
                }}
              >
                {q}kbps
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      {converting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <div style={{ height: 5, borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 'var(--r-pill)', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', margin: 0 }}>{progress}%</p>
        </div>
      )}

      {/* Convert button */}
      <button
        onClick={handleConvert}
        disabled={!filePath || converting}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'var(--sp-2)', padding: 'var(--sp-4) 0',
          borderRadius: 'var(--r-md)', border: 'none',
          fontSize: 13, fontWeight: 600,
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          color: 'white',
          cursor: !filePath || converting ? 'not-allowed' : 'pointer',
          opacity: !filePath || converting ? 0.4 : 1,
          boxShadow: !filePath ? 'none' : '0 4px 20px rgba(139,92,246,0.3)',
          transition: 'all 0.2s',
        }}
      >
        {converting
          ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />{t("converter.converting")}</>
          : t("converter.convert")
        }
      </button>
    </div>
  );
}
