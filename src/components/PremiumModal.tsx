import { useState, useEffect } from "react";
import { X, Zap, Copy } from "lucide-react";
import { useDownloadStore } from "../stores/downloadStore";
import { tauriApi } from "../lib/tauri";

export function PremiumModal() {
  const { premiumOpen, setPremiumOpen, premium, setPremium, addToast } = useDownloadStore();
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [tab, setTab] = useState<"compare" | "activate">("compare");
  const [copied, setCopied] = useState(false);
  const [demoKey, setDemoKey] = useState<string | null>(null);

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

  if (!premiumOpen) return null;

  const isPremium = premium?.is_premium;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(1,11,24,0.85)",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        width: "90vw",
        maxWidth: 500,
        maxHeight: "90vh",
        background: "#040e1f",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={20} color="#f59e0b" />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
              {isPremium ? "Premium Activé" : "TelVid Premium"}
            </span>
          </div>
          <button
            onClick={() => setPremiumOpen(false)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
        }}>
          {isPremium ? (
            <div style={{
              textAlign: "center",
              padding: "40px 20px",
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(52,211,153,0.1)",
                border: "2px solid rgba(52,211,153,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Zap size={28} color="#34d399" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#34d399", margin: "0 0 8px" }}>
                Licence Premium Active
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                Toutes les fonctionnalités sont débloquées
              </p>
            </div>
          ) : tab === "compare" ? (
            <div>
              {/* Tableau comparatif */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 0", fontSize: 11, color: "#475569", fontWeight: 600 }}></th>
                    <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 10, color: "#475569", fontWeight: 600 }}>GRATUIT</th>
                    <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>PREMIUM</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.06)" }}>Qualité vidéo</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#475569", borderTop: "1px solid rgba(255,255,255,0.06)" }}>480p</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#f1f5f9", fontWeight: 600, borderTop: "1px solid rgba(255,255,255,0.06)" }}>1080p+</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.06)" }}>Téléchargements simultanés</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#475569", borderTop: "1px solid rgba(255,255,255,0.06)" }}>2</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#f1f5f9", fontWeight: 600, borderTop: "1px solid rgba(255,255,255,0.06)" }}>5</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.06)" }}>Mode Turbo</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#475569", borderTop: "1px solid rgba(255,255,255,0.06)" }}>✗</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#34d399", fontWeight: 600, borderTop: "1px solid rgba(255,255,255,0.06)" }}>✓</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px 8px", fontSize: 13, color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.06)" }}>Conversions FFmpeg</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#475569", borderTop: "1px solid rgba(255,255,255,0.06)" }}>Basique</td>
                    <td style={{ textAlign: "center", padding: "10px 4px", fontSize: 12, color: "#f1f5f9", fontWeight: 600, borderTop: "1px solid rgba(255,255,255,0.06)" }}>Accélérée</td>
                  </tr>
                </tbody>
              </table>

              <button
                onClick={() => setTab("activate")}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #f59e0b, #f97316)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Zap size={16} />
                Activer Premium
              </button>
            </div>
          ) : (
            <div>
              {/* Demo section */}
              <div style={{
                padding: 16,
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.08))",
                borderRadius: 12,
                marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", margin: "0 0 4px" }}>
                  Essai gratuit - 7 jours
                </p>
                <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 12px" }}>
                  Testez toutes les fonctionnalités Premium
                </p>

                {demoKey && (
                  <div style={{
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <code style={{
                      flex: 1,
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: "#94a3b8",
                      wordBreak: "break-all",
                    }}>
                      {demoKey}
                    </code>
                    <button
                      onClick={handleCopyKey}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 4,
                        cursor: "pointer",
                        color: copied ? "#34d399" : "#64748b",
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleActivateDemo}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Zap size={14} />
                  Activer la démo
                </button>
              </div>

              {/* Divider */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "16px 0",
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize: 11, color: "#334155" }}>ou</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Manual activation */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", margin: "0 0 8px" }}>
                  Clé de licence
                </p>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  placeholder="Entrez votre clé"
                  onKeyDown={e => e.key === "Enter" && handleActivate()}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#f1f5f9",
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                    marginBottom: 12,
                  }}
                />
                <button
                  onClick={handleActivate}
                  disabled={!licenseKey.trim() || activating}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: "none",
                    background: licenseKey.trim()
                      ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                      : "rgba(255,255,255,0.05)",
                    color: licenseKey.trim() ? "white" : "#334155",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: licenseKey.trim() ? "pointer" : "not-allowed",
                    opacity: activating ? 0.7 : 1,
                  }}
                >
                  {activating ? "Vérification..." : "Activer"}
                </button>
              </div>

              {/* Back to compare */}
              <button
                onClick={() => setTab("compare")}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: 10,
                  background: "none",
                  border: "none",
                  color: "#475569",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ← Retourner à la comparaison
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
