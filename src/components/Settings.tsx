import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderOpen, FolderEdit, RotateCcw, Globe, Zap, HardDrive, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDownloadStore } from "../stores/downloadStore";
import { tauriApi } from "../lib/tauri";

export function Settings() {
  const { i18n } = useTranslation();
  const {
    settingsOpen, setSettingsOpen,
    outputPath, setOutputPath,
    language, setLanguage,
    turboMode, setTurboMode,
    alwaysAskFolder, setAlwaysAskFolder,
    premium, addToast, setPremiumOpen,
  } = useDownloadStore();

  const [currentPath, setCurrentPath] = useState(outputPath || "");
  const [loading, setLoading] = useState(false);

  // Charge le dossier actuel à l'ouverture
  useEffect(() => {
    if (!settingsOpen) return;
    tauriApi.getDownloadDir().then((p) => {
      setCurrentPath(p);
      setOutputPath(p);
    }).catch(console.error);
  }, [settingsOpen]);

  const handleOpenFolder = () => {
    tauriApi.openDownloadDir().catch(console.error);
  };

  const handleResetFolder = async () => {
    setLoading(true);
    try {
      const path = await tauriApi.getDownloadDir();
      await tauriApi.setDownloadDir(path);
      setCurrentPath(path);
      setOutputPath(path);
      addToast({ message: "Dossier réinitialisé", type: "success" });
    } catch (e) {
      addToast({ message: String(e), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFolder = async () => {
    // Sur Windows, on ouvre un input pour saisir le chemin manuellement
    // (le dialog natif nécessite une permission supplémentaire)
    const input = window.prompt("Entrez le chemin du dossier de téléchargement :", currentPath);
    if (!input || input === currentPath) return;
    setLoading(true);
    try {
      const saved = await tauriApi.setDownloadDir(input);
      setCurrentPath(saved);
      setOutputPath(saved);
      addToast({ message: "Dossier mis à jour", type: "success" });
    } catch (e) {
      addToast({ message: String(e), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    tauriApi.saveSetting("language", lang).catch(console.error);
  };

  const handleTurboChange = (v: boolean) => {
    if (!premium?.turbo_mode) return;
    setTurboMode(v);
    tauriApi.saveSetting("turbo_mode", v ? "true" : "false").catch(console.error);
  };

  const handleAlwaysAskChange = (v: boolean) => {
    setAlwaysAskFolder(v);
    tauriApi.saveSetting("always_ask_folder", v ? "true" : "false").catch(console.error);
  };

  return (
    <AnimatePresence>
      {settingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(1,11,24,0.75)",
              backdropFilter: "blur(6px)",
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: 420, zIndex: 201,
              background: "var(--layer-1)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
                  Paramètres
                </h2>
                <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 0 0" }}>
                  Configuration de TelVid-Vizane
                </p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, cursor: "pointer", color: "#64748b",
                  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f1f5f9"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                {/* ── Section Téléchargements ── */}
                <Section icon={<HardDrive size={15} />} title="Téléchargements">

                  {/* Dossier actuel */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>
                      Dossier de destination
                    </label>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px", borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <FolderOpen size={14} color="#3b82f6" style={{ flexShrink: 0 }} />
                      <span style={{
                        fontSize: 12, color: "#94a3b8", flex: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {currentPath || "Chargement..."}
                      </span>
                    </div>

                    {/* Actions dossier */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <ActionButton
                        icon={<FolderEdit size={13} />}
                        label="Modifier"
                        onClick={handleChangeFolder}
                        disabled={loading}
                        color="#3b82f6"
                      />
                      <ActionButton
                        icon={<FolderOpen size={13} />}
                        label="Ouvrir"
                        onClick={handleOpenFolder}
                        disabled={loading}
                        color="#06b6d4"
                      />
                      <ActionButton
                        icon={<RotateCcw size={13} />}
                        label="Réinitialiser"
                        onClick={handleResetFolder}
                        disabled={loading}
                        color="#64748b"
                      />
                    </div>
                  </div>

                  {/* Toujours demander */}
                  <Toggle
                    label="Toujours demander où enregistrer"
                    sublabel="Une boîte de dialogue s'ouvrira à chaque téléchargement"
                    value={alwaysAskFolder}
                    onChange={handleAlwaysAskChange}
                    color="#3b82f6"
                  />
                </Section>

                {/* ── Section Performances ── */}
                <Section icon={<Zap size={15} />} title="Performances">
                  <Toggle
                    label="Mode Turbo"
                    sublabel={premium?.turbo_mode ? "Téléchargement multi-fragments accéléré" : "Disponible en version Premium"}
                    value={turboMode}
                    onChange={handleTurboChange}
                    color="#f59e0b"
                    disabled={!premium?.turbo_mode}
                  />
                </Section>

                {/* ── Section Premium ── */}
                <Section icon={<Crown size={15} />} title="Premium">
                  {premium?.is_premium ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Zap size={16} color="#f59e0b" />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", margin: 0 }}>
                          Licence Premium active
                        </p>
                        <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 0 0" }}>
                          {premium.concurrent_downloads} téléchargements simultanés · Turbo activé
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>
                        Débloquez les téléchargements simultanés, le mode Turbo et la qualité HD illimitée.
                      </p>
                      <button
                        onClick={() => { setSettingsOpen(false); setPremiumOpen(true); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                          fontSize: 13, fontWeight: 700,
                          background: "linear-gradient(135deg, #f59e0b, #f97316)",
                          color: "white",
                          boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
                          transition: "all 0.2s",
                        }}
                      >
                        <Zap size={14} />
                        Découvrir Premium
                      </button>
                    </div>
                  )}
                </Section>

                {/* ── Section Langue ── */}
                <Section icon={<Globe size={15} />} title="Langue">
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { code: "fr", label: "Français" },
                      { code: "en", label: "English" },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        style={{
                          flex: 1, padding: "10px 0", borderRadius: 10,
                          fontSize: 13, fontWeight: 500, cursor: "pointer",
                          transition: "all 0.18s",
                          background: language === lang.code ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                          border: language === lang.code ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          color: language === lang.code ? "#3b82f6" : "#64748b",
                        }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </Section>

              </div>
            </div>

            {/* Footer version */}
            <div style={{
              padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}>
              <p style={{ fontSize: 10, color: "#1e293b", margin: 0, textAlign: "center" }}>
                TelVid-Vizane v0.1.0 · {premium?.is_premium ? "Premium" : "Free"}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ color: "#475569" }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </span>
      </div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 14,
        padding: "16px 18px", borderRadius: 14,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {children}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled, color }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  disabled?: boolean; color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "8px 0", borderRadius: 9, fontSize: 12, fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        background: `${color}18`, color, border: `1px solid ${color}30`,
        transition: "all 0.18s",
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = `${color}28`; }}
      onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = `${color}18`; }}
    >
      {icon} {label}
    </button>
  );
}

function Toggle({ label, sublabel, value, onChange, color, disabled }: {
  label: string; sublabel?: string; value: boolean;
  onChange: (v: boolean) => void; color: string; disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: disabled ? "#334155" : "#94a3b8", margin: 0 }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontSize: 11, color: "#334155", margin: "3px 0 0 0", lineHeight: 1.4 }}>
            {sublabel}
          </p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        style={{
          position: "relative", width: 44, height: 24, borderRadius: 12,
          background: value && !disabled ? color : "rgba(255,255,255,0.08)",
          border: "none", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.35 : 1, transition: "background 0.25s", flexShrink: 0,
        }}
      >
        <motion.span
          animate={{ left: value && !disabled ? 22 : 3 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          style={{
            position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9,
            background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}
