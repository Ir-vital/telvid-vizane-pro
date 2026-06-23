import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, ChevronRight, Download, Layers } from "lucide-react";
import { useDownloadStore } from "../stores/downloadStore";

const HIGHLIGHTS = [
  { icon: <Layers size={13} />, text: "Téléchargements simultanés" },
  { icon: <Zap size={13} />,    text: "Mode Turbo (16 fragments)" },
  { icon: <Download size={13} />, text: "Qualité HD illimitée" },
];

export function PremiumBanner() {
  const { premium, setPremiumOpen } = useDownloadStore();
  const [dismissed, setDismissed] = useState(false);

  // N'affiche que si FREE et pas encore fermé
  if (premium?.is_premium || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(6,182,212,0.06) 100%)",
          border: "1px solid rgba(139,92,246,0.2)",
          boxShadow: "0 0 0 1px rgba(59,130,246,0.06), 0 4px 24px rgba(0,0,0,0.2)",
        }}
      >
        {/* Ligne décorative en haut */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)",
          opacity: 0.7,
        }} />

        <div style={{ padding: "16px 18px 16px 18px", display: "flex", alignItems: "center", gap: 16 }}>

          {/* Icône */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))",
            border: "1px solid rgba(245,158,11,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={16} color="#f59e0b" fill="rgba(245,158,11,0.3)" />
          </div>

          {/* Texte */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", margin: "0 0 6px 0" }}>
              Débloquez TelVid Premium
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {HIGHLIGHTS.map((h, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                  <span style={{ color: "#475569" }}>{h.icon}</span>
                  {h.text}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPremiumOpen(true)}
            style={{
              flexShrink: 0,
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10,
              fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "white", border: "none", cursor: "pointer",
              boxShadow: "0 0 20px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              whiteSpace: "nowrap",
            }}
          >
            Découvrir
            <ChevronRight size={13} />
          </motion.button>

          {/* Fermer */}
          <button
            onClick={() => setDismissed(true)}
            style={{
              flexShrink: 0, background: "none", border: "none",
              cursor: "pointer", color: "#334155", padding: 4,
              display: "flex", borderRadius: 6, transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#64748b")}
            onMouseLeave={e => (e.currentTarget.style.color = "#334155")}
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
