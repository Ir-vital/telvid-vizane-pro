import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize2, ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDownloadStore } from "../stores/downloadStore";
import { tauriApi } from "../lib/tauri";

const SUPPORTED = ["mp4", "webm", "mkv", "mov", "ogg"];

export function VideoPlayer() {
  const { t } = useTranslation();
  const { playerVideo, setPlayerVideo } = useDownloadStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState(false);

  if (!playerVideo) return null;

  const ext = playerVideo.file_path.split(".").pop()?.toLowerCase() || "";
  const isSupported = SUPPORTED.includes(ext);

  const togglePlay = () => {
    if (!videoRef.current) return;
    playing ? videoRef.current.pause() : videoRef.current.play();
    setPlaying(!playing);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
  };

  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
        background: '#000',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--sp-2) var(--sp-4)',
        background: 'var(--layer-2)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        minHeight: 40,
      }}>
        <span style={{
          fontSize: 12, color: '#94a3b8', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, marginRight: 8,
        }}>
          {playerVideo.title}
        </span>
        <button
          onClick={() => setPlayerVideo(null)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#475569', padding: 4, display: 'flex', flexShrink: 0,
            borderRadius: 'var(--r-sm)', transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
        >
          <X size={14} />
        </button>
      </div>

      {/* Video or fallback */}
      {isSupported && !error ? (
        <video
          ref={videoRef}
          src={`asset://localhost/${playerVideo.file_path}`}
          style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#000', display: 'block' }}
          onTimeUpdate={() => {
            if (!videoRef.current) return;
            const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(isNaN(p) ? 0 : p);
          }}
          onError={() => setError(true)}
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: 120, gap: 'var(--sp-3)',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>{t("player.unsupported")}</p>
          <button
            onClick={() => tauriApi.openFile(playerVideo.file_path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: '#3b82f6', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <ExternalLink size={12} /> Ouvrir avec VLC
          </button>
        </div>
      )}

      {/* Controls */}
      {isSupported && !error && (
        <div style={{
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'var(--layer-2)',
          display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)',
        }}>
          {/* Seek bar */}
          <div
            onClick={handleSeek}
            style={{
              height: 4, borderRadius: 'var(--r-pill)', cursor: 'pointer',
              background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
            }}
          >
            <div
              className="progress-bar-neon"
              style={{ height: '100%', borderRadius: 'var(--r-pill)', width: `${progress}%`, transition: 'width 0.1s' }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <button
              onClick={togglePlay}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (videoRef.current) videoRef.current.volume = v;
              }}
              style={{ width: 64, height: 3, accentColor: '#3b82f6' }}
            />

            <button
              onClick={handleSpeedChange}
              style={{
                marginLeft: 'auto', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--r-sm)', cursor: 'pointer',
                color: '#64748b', fontSize: 10, fontWeight: 600,
                padding: '2px 7px',
              }}
            >
              {speed}x
            </button>

            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, display: 'flex' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
