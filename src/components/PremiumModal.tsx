import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Lock, Download, Layers, Shield, Star } from "lucide-react";
import { useDownloadStore } from "../stores/downloadStore";
import { tauriApi } from "../lib/tauri";

// ─── Données ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Layers size={16} />,
    title: "Téléchargements simultanés",
    free: "1 à la fois",
    premium: "Jusqu'à 5",
    color: "#3b82f6",
  },
  {
    icon: <Zap size={16} />,
    title: "Mode Turbo",
    free: "4 fragments",
    premium: "16 fragments",
    color: "#f59e0b",
  },
  {
    icon: <Download size={16} />,
    title: "Qualité vidéo",
    free: "480p max",
    premium: "1080p + illimité",
    color: "#8b5cf6",
  },
  {
    icon: <Star size={16} />,
    title: "Priorité de téléchargement",
    free: "Standard",
    premium: "Haute priorité",
    color: "#06b6d4",
  },
  {
    icon: <Shield size={16} />,
    title: "Conversions FFmpeg",
    free: "Basique",
    premium: "Accélérée",
    color: "#34d399",
  },
];

// ─── PremiumModal ─────────────────────────────────────────────────────────────

export function PremiumModal() {
  const { premiumOpen, setPremiumOpen, premium, setPremium, addToast } = useDownloadStore();
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [tab, setTab] = useState<"compare" | "activate">("compare");

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setActivating(true);
    try {
      // Sauvegarde la clé localement et re-vérifie le statut
      await tauriApi.saveSetting("license_key", licenseKey.trim());
      const status = await tauriApi.checkPremiumStatus();
      setPremium(status);
      if (status.is_premium) {
        addToast({ message: "Licence activée avec succès !", type: "success" });
        setPremiumOpen(false);
      } else {
        addToast({ message: "Clé de licence invalide", type: "error" });
      }
    } catch (e) {
      addToast({ message: String(e), type: "error" });
    } finally {
      setActivating(false);
    }
  };

  return (
    <AnimatePresence>
      {premiumOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPremiumOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: "rgba(1,8,20,0.82)",
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 520, maxHeight: "88vh",
              zIndex: 301,
              background: "var(--layer-1)",
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 0 0 1px rgba(139,92,246,0.15), 0 24px 80px rgba(0,0,0,0.6)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Ligne décorative */}
            <div style={{
              height: 3,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #f59e0b, #06b6d4)",
            }} />

            {/* Header */}
            <div style={{
              padding: "24px 28px 20px 28px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))",
                    border: "1px solid rgba(245,158,11,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Zap size={17} color="#f59e0b" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" }}>
                      TelVid Premium
                    </h2>
                    <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                      {premium?.is_premium ? "Licence active" : "Débloquez toutes les fonctionnalités"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPremiumOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, cursor: "pointer", color: "#64748b",
                  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s", flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            {!premium?.is_premium && (
              <div style={{
                display: "flex", margin: "0 28px 20px 28px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10, padding: 3,
                flexShrink: 0,
              }}>
                {[
                  { key: "compare", label: "Comparer" },
                  { key: "activate", label: "Activer une licence" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key as "compare" | "activate")}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8,
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: "none", transition: "all 0.18s",
                      background: tab === t.key ? "rgba(255,255,255,0.08)" : "transparent",
                      color: tab === t.key ? "#f1f5f9" : "#475569",
                      boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 28px 28px" }}>
              <AnimatePresence mode="wait">

                {/* ── Onglet Comparer ── */}
                {(tab === "compare" || premium?.is_premium) && (
                  <motion.div
                    key="compare"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    {/* En-têtes colonnes */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <div style={{ flex: 1 }} />
                      <div style={{
                        width: 100, textAlign: "center",
                        fontSize: 11, fontWeight: 700, color: "#475569",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                      }}>
                        Free
                      </div>
                      <div style={{
                        width: 120, textAlign: "center",
                        fontSize: 11, fontWeight: 700, color: "#f59e0b",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        background: "rgba(245,158,11,0.08)",
                        borderRadius: 8, padding: "4px 0",
                        border: "1px solid rgba(245,158,11,0.15)",
                      }}>
                        ⚡ Premium
                      </div>
                    </div>

                    {/* Lignes de comparaison */}
                    {FEATURES.map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "12px 14px", borderRadius: 12,
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* Feature */}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: `${f.color}15`,
                            border: `1px solid ${f.color}25`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: f.color,
                          }}>
                            {f.icon}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>
                            {f.title}
                          </span>
                        </div>

                        {/* Free */}
                        <div style={{ width: 100, textAlign: "center" }}>
                          <span style={{ fontSize: 11, color: "#475569" }}>{f.free}</span>
                        </div>

                        {/* Premium */}
                        <div style={{
                          width: 120, textAlign: "center",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        }}>
                          <Check size={12} color="#34d399" />
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#f1f5f9" }}>
                            {f.premium}
                          </span>
                        </div>
                      </motion.div>
                    ))}

                    {/* CTA si FREE */}
                    {!premium?.is_premium && (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setTab("activate")}
                        style={{
                          marginTop: 8,
                          width: "100%", padding: "14px 0",
                          borderRadius: 13, border: "none", cursor: "pointer",
                          fontSize: 14, fontWeight: 700,
                          background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
                          color: "white",
                          boxShadow: "0 4px 24px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                        }}
                      >
                        Activer ma licence →
                      </motion.button>
                    )}

                    {/* Statut si PREMIUM */}
                    {premium?.is_premium && (
                      <div style={{
                        marginTop: 8, padding: "16px 18px", borderRadius: 13,
                        background: "rgba(52,211,153,0.07)",
                        border: "1px solid rgba(52,211,153,0.2)",
                        display: "flex", alignItems: "center", gap: 12,
                      }}>
                        <Check size={18} color="#34d399" />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#34d399", margin: 0 }}>
                            Licence Premium active
                          </p>
                          <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 0 0" }}>
                            Toutes les fonctionnalités sont débloquées
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Onglet Activer ── */}
                {tab === "activate" && !premium?.is_premium && (
                  <motion.div
                    key="activate"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", flexDirection: "column", gap: 20 }}
                  >
                    <div style={{
                      padding: "20px", borderRadius: 14,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      display: "flex", flexDirection: "column", gap: 16,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Lock size={16} color="#64748b" />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", margin: 0 }}>
                            Clé de licence
                          </p>
                          <p style={{ fontSize: 11, color: "#334155", margin: "3px 0 0 0" }}>
                            Entrez votre clé pour activer Premium
                          </p>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={licenseKey}
                        onChange={e => setLicenseKey(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        onKeyDown={e => e.key === "Enter" && handleActivate()}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10, padding: "12px 16px",
                          fontSize: 14, fontWeight: 600, color: "#f1f5f9",
                          outline: "none", width: "100%",
                          letterSpacing: "0.08em",
                          caretColor: "#3b82f6",
                          fontFamily: "monospace",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      />

                      <motion.button
                        whileHover={{ scale: licenseKey.trim() ? 1.01 : 1 }}
                        whileTap={{ scale: licenseKey.trim() ? 0.99 : 1 }}
                        onClick={handleActivate}
                        disabled={!licenseKey.trim() || activating}
                        style={{
                          padding: "13px 0", borderRadius: 11, border: "none",
                          fontSize: 13, fontWeight: 700, cursor: !licenseKey.trim() ? "not-allowed" : "pointer",
                          background: licenseKey.trim()
                            ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                            : "rgba(255,255,255,0.05)",
                          color: licenseKey.trim() ? "white" : "#334155",
                          boxShadow: licenseKey.trim() ? "0 4px 20px rgba(59,130,246,0.35)" : "none",
                          opacity: activating ? 0.7 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        {activating ? "Vérification..." : "Activer la licence"}
                      </motion.button>
                    </div>

                    {/* Info */}
                    <p style={{ fontSize: 11, color: "#1e293b", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                      La clé de licence est vérifiée localement.
                      <br />
                      Aucune connexion internet requise pour l'activation.
                    </p>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
