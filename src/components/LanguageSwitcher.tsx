import { useTranslation } from "react-i18next";
import { useDownloadStore } from "../stores/downloadStore";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useDownloadStore();

  const toggle = () => {
    const next = language === "fr" ? "en" : "fr";
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-all"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <span className="font-medium">{language.toUpperCase()}</span>
      <span className="text-slate-600">/</span>
      <span className="text-slate-600">{language === "fr" ? "EN" : "FR"}</span>
    </button>
  );
}
