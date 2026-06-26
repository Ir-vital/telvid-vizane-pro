import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Lock, Download, Layers, Shield, Star, Copy, Sparkles, Clock } from "lucide-react";
import { useDownloadStore } from "../stores/downloadStore";
import { tauriApi } from "../lib/tauri";

// ─── Données ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Layers size={16} />,
    title: "Téléchargements simultanés",
    free: "2 à la fois",
    premium: "Jusqu'à 5",
    color: "#3b82f6",
  },
  {
    icon: <Zap size={16} />,
    title: "Mode Turbo",
    free: "Désactivé",
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
  const [copied, setCopied] = useState(false);
  const [demoKey, setDemoKey] = useState<string | null>(null);

  // Génère une clé démo au chargement de l'onglet activation
  useEffect(() => {
    if (tab === "activate" && !premium?.is_premium && !demoKey) {
      generateDemoKey();
    }
  }, [tab, premium?.is_premium]);

  const generateDemoKey = async () => {
    try {
      const key = await tauriApi.generateDemoLicense(7);
      setDemoKey(key);
    } catch (e) {
      console.error("Failed to generate demo key:", e);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setActivating(true);
    try {
      const result = await tauriApi.activateLicense(licenseKey.trim());
      if (result.success) {
        setPremium(result.status);
        addToast({ message: result.message, type: "success" });
        setPremiumOpen(false);
        setLicenseKey("");
      } else {
        addToast({ message: result.message, type: "error" });
      }
    } catch (e) {
      addToast({ message: String(e), type: "error" });
    } finally {
      setActivating(false);
    }
  };

  const handleActivateDemo = async () => {
    if (!demoKey) return;
    setLicenseKey(demoKey);
    await handleActivate();
  };

  const handleCopyKey = () => {
    if (demoKey) {
      navigator.clipboard.writeText(demoKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiryDate = (isoDate: string | null) => {
    if (!isoDate) return "Jamais";
    try {
      return new Date(isoDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return isoDate;
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
              width: "90vw",
              maxWidth: 480,
              maxHeight: "90vh",
              zIndex: 301,
              background: "var(--layer-1)",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 0 0 1px rgba(139,92,246,0.15), 0 24px 80px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Ligne décorative */}
            <div style={{
              height: 3,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #f59e0b, #06b6d4)",
              flexShrink: 0,
            }} />

            {/* Header */}
            <div style={{
              padding: "16px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: premium?.is_premium
                      ? "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))"
                      : "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))",
                    border: premium?.is_premium
                      ? "1px solid rgba(52,211,153,0.3)"
                      : "1px solid rgba(245,158,11,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {premium?.is_premium ? (
                      <Check size={17} color="#34d399" />
                    ) : (
                      <Zap size={17} color="#f59e0b" />
                    )}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" }}>
                      {premium?.is_premium ? "Premium Activé" : "TelVid Premium"}
                    </h2>
                    <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                      {premium?.is_premium
                        ? `Licence ${premium.license_type} • Expire: ${formatExpiryDate(premium.expires_at)}`
                        : "Débloquez toutes les fonctionnalités"
                      }
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

            {/* Tabs - seulement si pas premium */}
            {!premium?.is_premium && (
              <div style={{
                display: "flex", margin: "0 20px 12px 20px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 8, padding: 3,
                flexShrink: 0,
              }}>
                {[
                  { key: "compare", label: "Comparer" },
                  { key: "activate", label: "Activer" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key as "compare" | "activate")}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 6,
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
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

            {/* Content - scrollable */}
            <div style={{ 
              flex: 1, 
              minHeight: 0,  // Important pour que flex shrink fonctionne
              overflowY: "auto", 
              padding: "0 20px 20px 20px" 
            }}>
              <AnimatePresence mode="wait">

                {/* ── Onglet Comparer ── */}
                {(tab === "compare" || premium?.is_premium) && (
                  <motion.div
                    key="compare"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {/* En-têtes colonnes */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <div style={{ flex: 1 }} />
                      <div style={{ width: 80, textAlign: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Gratuit
                        </span>
                      </div>
                      <div style={{ width: 100, textAlign: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Premium
                        </span>
                      </div>
                    </div>

                    {/* Lignes de features */}
                    {FEATURES.map((f, i) => (
                      <motion.div
                        key={i}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
                          background: "rgba(255,255,255,0.025)", borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                            background: `${f.color}15`,
                            border: `1px solid ${f.color}25`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: f.color,
                          }}>
                            {f.icon}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
                            {f.title}
                          </span>
                        </div>
                        <div style={{ width: 80, textAlign: "center" }}>
                          <span style={{ fontSize: 10, color: "#475569" }}>{f.free}</span>
                        </div>
                        <div style={{
                          width: 100, textAlign: "center",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                        }}>
                          <Check size={10} color="#34d399" />
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#f1f5f9" }}>
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
                          width: "100%", padding: "12px 0",
                          borderRadius: 10, border: "none", cursor: "pointer",
                          fontSize: 13, fontWeight: 700,
                          background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
                          color: "white",
                          boxShadow: "0 4px 20px rgba(245,158,11,0.35)",
                        }}
                      >
                        Activer Premium →
                      </motion.button>
                    )}

                    {/* Statut si PREMIUM */}
                    {premium?.is_premium && (
                      <div style={{
                        marginTop: 8, padding: "12px 14px", borderRadius: 10,
                        background: "rgba(52,211,153,0.07)",
                        border: "1px solid rgba(52,211,153,0.2)",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <Check size={14} color="#34d399" />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#34d399", margin: 0 }}>
                            Licence Premium active
                          </p>
                          <p style={{ fontSize: 10, color: "#475569", margin: "2px 0 0 0" }}>
                            Toutes les fonctionnalités débloquées
                          </p>
                        </div>
                        <Clock size={12} color="#475569" />
                        <span style={{ fontSize: 10, color: "#475569" }}>
                          {formatExpiryDate(premium.expires_at)}
                        </span>
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
                    style={{ display: "flex", flexDirection: "column", gap: 14 }}
                  >
                    {/* Section Demo */}
                    <div style={{
                      padding: "14px",
                      background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.05))",
                      borderRadius: 12,
                      border: "1px solid rgba(139,92,246,0.2)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <Sparkles size={16} color="#8b5cf6" />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", margin: 0 }}>
                            Essai gratuit - 7 jours
                          </p>
                          <p style={{ fontSize: 10, color: "#64748b", margin: "2px 0 0 0" }}>
                            Testez toutes les fonctionnalités
                          </p>
                        </div>
                      </div>

                      {demoKey && (
                        <div style={{
                          background: "rgba(0,0,0,0.3)",
                          borderRadius: 6,
                          padding: "8px 10px",
                          marginBottom: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}>
                          <code style={{
                            flex: 1,
                            fontSize: 9,
                            fontFamily: "monospace",
                            color: "#94a3b8",
                            wordBreak: "break-all",
                          }}>
                            {demoKey}
                          </code>
                          <button
                            onClick={handleCopyKey}
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 6px",
                              cursor: "pointer",
                              color: copied ? "#34d399" : "#64748b",
                              transition: "all 0.15s",
                            }}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleActivateDemo}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: 8,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                          color: "white",
                          boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Zap size={12} />
                        Activer la démo
                      </motion.button>
                    </div>

                    {/* Séparateur */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                      <span style={{ fontSize: 10, color: "#334155" }}>ou</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    </div>

                    {/* Section Clé manuelle */}
                    <div style={{
                      padding: "14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Lock size={14} color="#64748b" />
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: 0 }}>
                          Clé de licence
                        </p>
                      </div>

                      <input
                        type="text"
                        value={licenseKey}
                        onChange={e => setLicenseKey(e.target.value)}
                        placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX"
                        onKeyDown={e => e.key === "Enter" && handleActivate()}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#f1f5f9",
                          outline: "none",
                          width: "100%",
                          letterSpacing: "0.04em",
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
                          padding: "10px 0",
                          borderRadius: 8,
                          border: "none",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: !licenseKey.trim() ? "not-allowed" : "pointer",
                          background: licenseKey.trim()
                            ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                            : "rgba(255,255,255,0.05)",
                          color: licenseKey.trim() ? "white" : "#334155",
                          boxShadow: licenseKey.trim() ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
                          opacity: activating ? 0.7 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        {activating ? "Vérification..." : "Activer"}
                      </motion.button>
                    </div>

                    {/* Info */}
                    <p style={{ fontSize: 10, color: "#1e293b", textAlign: "center", margin: 0 }}>
                      Activation locale • Aucune connexion requise
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
