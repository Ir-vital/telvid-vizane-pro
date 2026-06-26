import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, MonitorPlay, Download, ArrowRight, Check } from "lucide-react";

const STEPS = [
  {
    icon: <Link size={28} />,
    color: "#3b82f6",
    title: "Collez un lien",
    desc: "YouTube, TikTok, Instagram, Vimeo et bien d'autres. Copiez simplement l'URL de la vidéo.",
  },
  {
    icon: <MonitorPlay size={28} />,
    color: "#8b5cf6",
    title: "Choisissez le format",
    desc: "HD 1080p, SD 480p ou Audio MP3. L'application analyse automatiquement les formats disponibles.",
  },
  {
    icon: <Download size={28} />,
    color: "#06b6d4",
    title: "Téléchargez",
    desc: "Le fichier est converti en MP4 ou MP3 et ajouté à votre bibliothèque. Simple et rapide.",
  },
];

const STORAGE_KEY = "telvid_onboarding_done";

export function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Affiche seulement au premier lancement
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Petit délai pour laisser l'app se charger
      setTimeout(() => setVisible(true), 600);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleDone();
    }
  };

  const handleDone = () => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
    }, 300);
  };

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 400,
              background: "rgba(1,8,20,0.88)",
              backdropFilter: "blur(10px)",
            }}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 0.95 : 1, y: leaving ? -12 : 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -16 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90vw",
              maxWidth: 420,
              maxHeight: "85vh",
              zIndex: 401,
              background: "var(--layer-1)",
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 0 0 1px rgba(59,130,246,0.1), 0 32px 80px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Contenu scrollable */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
              
              {/* Barre de progression */}
              <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 3, borderRadius: 99,
                      background: i <= step ? current.color : "rgba(255,255,255,0.08)",
                      transition: "background 0.3s",
                    }}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22 }}
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                  {/* Icône */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: `${current.color}18`,
                    border: `1px solid ${current.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: current.color,
                    boxShadow: `0 0 20px ${current.color}15`,
                  }}>
                    {current.icon}
                  </div>

                  {/* Texte */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: current.color,
                        background: `${current.color}15`,
                        padding: "2px 8px", borderRadius: 99,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>
                        Étape {step + 1} / {STEPS.length}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" }}>
                      {current.title}
                    </h2>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                      {current.desc}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                <button
                  onClick={handleDone}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, color: "#334155", padding: "8px 0",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#64748b")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#334155")}
                >
                  Passer
                </button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleNext}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", borderRadius: 12, border: "none",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: step === STEPS.length - 1
                      ? "linear-gradient(135deg, #34d399, #10b981)"
                      : `linear-gradient(135deg, ${current.color}, ${current.color}cc)`,
                    color: "white",
                    boxShadow: `0 4px 20px ${current.color}40`,
                  }}
                >
                  {step === STEPS.length - 1 ? (
                    <><Check size={14} /> C'est parti !</>
                  ) : (
                    <>Suivant <ArrowRight size={14} /></>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
