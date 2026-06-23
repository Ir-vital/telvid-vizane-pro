import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useDownloadStore } from "../stores/downloadStore";

const ICONS = {
  success: <CheckCircle size={15} color="#34d399" />,
  error:   <AlertCircle size={15} color="#f87171" />,
  info:    <Info        size={15} color="#3b82f6" />,
};

const STYLES = {
  success: { border: '1px solid rgba(52,211,153,0.25)',  background: 'rgba(52,211,153,0.08)'  },
  error:   { border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)' },
  info:    { border: '1px solid rgba(59,130,246,0.25)',  background: 'rgba(59,130,246,0.08)'  },
};

export function NotificationToast() {
  const { toasts, removeToast } = useDownloadStore();

  return (
    <div style={{
      position: 'fixed', bottom: 'var(--sp-5)', right: 'var(--sp-5)',
      zIndex: 100, display: 'flex', flexDirection: 'column',
      gap: 'var(--sp-2)', pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center',
              gap: 'var(--sp-3)',
              padding: 'var(--sp-3) var(--sp-4)',
              borderRadius: 'var(--r-md)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              minWidth: 260, maxWidth: 360,
              ...STYLES[toast.type],
            }}
          >
            <div style={{ flexShrink: 0 }}>{ICONS[toast.type]}</div>
            <span style={{ fontSize: 13, color: '#e2e8f0', flex: 1, lineHeight: 1.4 }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#475569', padding: 2, display: 'flex', flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
