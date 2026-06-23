import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Lock, Zap, Music, MonitorPlay, Headphones } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDownloadStore } from "../stores/downloadStore";
import { useDownload } from "../hooks/useDownload";

// ─── Définition des formats ───────────────────────────────────────────────────
const FORMATS = [
  {
    id: "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    label: "HD 1080p",
    sublabel: "Meilleure qualité",
    icon: <MonitorPlay size={20} />,
    premium: true,
    extractAudio: false,
    accentColor: '#8b5cf6',
    accentBg: 'rgba(139,92,246,0.12)',
    accentBorder: 'rgba(139,92,246,0.45)',
    accentGlow: 'rgba(139,92,246,0.2)',
  },
  {
    id: "bestvideo[height<=480]+bestaudio/best[height<=480]",
    label: "SD 480p",
    sublabel: "Taille réduite",
    icon: <MonitorPlay size={20} />,
    premium: false,
    extractAudio: false,
    accentColor: '#3b82f6',
    accentBg: 'rgba(59,130,246,0.12)',
    accentBorder: 'rgba(59,130,246,0.45)',
    accentGlow: 'rgba(59,130,246,0.2)',
  },
  {
    id: "bestaudio/best",
    label: "MP3",
    sublabel: "320 kbps",
    icon: <Headphones size={20} />,
    premium: false,
    extractAudio: true,
    accentColor: '#06b6d4',
    accentBg: 'rgba(6,182,212,0.12)',
    accentBorder: 'rgba(6,182,212,0.45)',
    accentGlow: 'rgba(6,182,212,0.2)',
  },
];

// ─── Carte de format ──────────────────────────────────────────────────────────
function FormatCard({
  fmt,
  isSelected,
  locked,
  onClick,
}: {
  fmt: typeof FORMATS[number];
  isSelected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => !locked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: locked ? 1 : 0.97 }}
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--sp-3)',
        padding: 'var(--sp-5) var(--sp-3)',
        borderRadius: 'var(--r-lg)',
        border: isSelected
          ? `1.5px solid ${fmt.accentBorder}`
          : hovered
          ? '1.5px solid rgba(255,255,255,0.14)'
          : '1.5px solid rgba(255,255,255,0.07)',
        background: isSelected
          ? fmt.accentBg
          : hovered
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.03)',
        boxShadow: isSelected
          ? `0 0 24px ${fmt.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.06)`
          : 'none',
        cursor: locked ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Indicateur sélectionné en haut */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 3, borderRadius: '0 0 3px 3px',
              background: `linear-gradient(to right, ${fmt.accentColor}, ${fmt.accentColor}88)`,
              transformOrigin: 'left',
            }}
          />
        )}
      </AnimatePresence>

      {/* Icône */}
      <div style={{
        color: isSelected ? fmt.accentColor : locked ? '#1e293b' : hovered ? '#64748b' : '#334155',
        transition: 'color 0.2s',
      }}>
        {fmt.icon}
      </div>

      {/* Label + sublabel */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: isSelected ? fmt.accentColor : locked ? '#1e293b' : hovered ? '#94a3b8' : '#64748b',
          transition: 'color 0.2s',
        }}>
          {fmt.label}
        </span>
        <span style={{
          fontSize: 10,
          color: isSelected ? `${fmt.accentColor}99` : '#1e293b',
          transition: 'color 0.2s',
        }}>
          {fmt.sublabel}
        </span>
      </div>

      {/* Badge Premium */}
      {locked && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '2px 7px', borderRadius: 99,
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Lock size={8} color="#f59e0b" />
          <span style={{ fontSize: 9, fontWeight: 600, color: '#f59e0b', letterSpacing: '0.04em' }}>
            PREMIUM
          </span>
        </div>
      )}
    </motion.button>
  );
}

// ─── FormatPicker principal ───────────────────────────────────────────────────
export function FormatPicker() {
  const { t } = useTranslation();
  const { premium, turboMode, setTurboMode } = useDownloadStore();
  const { startDownload } = useDownload();
  const [selected, setSelected] = useState(FORMATS[1].id);
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedFormat = FORMATS.find((f) => f.id === selected)!;
  const isPremiumLocked = selectedFormat.premium && !premium?.is_premium;

  const handleDownload = async () => {
    if (isPremiumLocked || isDownloading) return;
    setIsDownloading(true);
    await startDownload(selected, selectedFormat.extractAudio);
    setIsDownloading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

      {/* Label section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: '#334155',
          textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0,
        }}>
          {t("formats.title")}
        </p>
        {selectedFormat && (
          <span style={{
            fontSize: 10, fontWeight: 500,
            color: selectedFormat.accentColor,
            background: selectedFormat.accentBg,
            padding: '2px 8px', borderRadius: 99,
            border: `1px solid ${selectedFormat.accentBorder}`,
          }}>
            {selectedFormat.label}
          </span>
        )}
      </div>

      {/* Format cards */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        {FORMATS.map((fmt) => {
          const locked = fmt.premium && !premium?.is_premium;
          return (
            <FormatCard
              key={fmt.id}
              fmt={fmt}
              isSelected={selected === fmt.id}
              locked={locked}
              onClick={() => !locked && setSelected(fmt.id)}
            />
          );
        })}
      </div>

      {/* Turbo toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-md)',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: turboMode && premium?.turbo_mode ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
            border: turboMode && premium?.turbo_mode ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.25s',
          }}>
            <Zap size={14} color={turboMode && premium?.turbo_mode ? '#f59e0b' : '#334155'} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                {t("formats.turbo")}
              </span>
              {!premium?.turbo_mode && (
                <span style={{
                  fontSize: 9, fontWeight: 600, color: '#f59e0b',
                  background: 'rgba(245,158,11,0.1)', padding: '1px 5px',
                  borderRadius: 99, border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  PREMIUM
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, color: '#1e293b' }}>
              {t("formats.turbo_desc")}
            </span>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={() => premium?.turbo_mode && setTurboMode(!turboMode)}
          style={{
            position: 'relative', width: 44, height: 24, borderRadius: 12,
            background: turboMode && premium?.turbo_mode
              ? 'linear-gradient(135deg, #f59e0b, #f97316)'
              : 'rgba(255,255,255,0.08)',
            border: 'none',
            cursor: !premium?.turbo_mode ? 'not-allowed' : 'pointer',
            opacity: !premium?.turbo_mode ? 0.3 : 1,
            transition: 'background 0.25s',
            flexShrink: 0,
          }}
        >
          <motion.span
            animate={{ left: turboMode && premium?.turbo_mode ? 22 : 3 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            style={{
              position: 'absolute', top: 3,
              width: 18, height: 18, borderRadius: 9,
              background: 'white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          />
        </button>
      </div>

      {/* Bouton Télécharger */}
      <motion.button
        whileHover={{ scale: isPremiumLocked || isDownloading ? 1 : 1.015 }}
        whileTap={{ scale: isPremiumLocked || isDownloading ? 1 : 0.985 }}
        onClick={handleDownload}
        disabled={isPremiumLocked || isDownloading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          padding: 'var(--sp-4) 0', borderRadius: 'var(--r-md)', border: 'none',
          fontSize: 14, fontWeight: 700, letterSpacing: '0.01em',
          cursor: isPremiumLocked ? 'not-allowed' : 'pointer',
          background: isPremiumLocked
            ? 'rgba(255,255,255,0.04)'
            : isDownloading
            ? 'rgba(59,130,246,0.3)'
            : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
          color: isPremiumLocked ? '#1e293b' : 'white',
          boxShadow: isPremiumLocked || isDownloading
            ? 'none'
            : '0 4px 24px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition: 'all 0.2s',
        }}
      >
        {isDownloading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ width: 15, height: 15, borderRadius: 8, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
            />
            Téléchargement...
          </>
        ) : isPremiumLocked ? (
          <>
            <Lock size={14} color="#334155" />
            {t("premium.upgrade")}
          </>
        ) : (
          <>
            <Download size={15} />
            {t("formats.download")}
          </>
        )}
      </motion.button>
    </div>
  );
}
