use serde::{Deserialize, Serialize};
use crate::db;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub download_path: String,
    pub always_ask_folder: bool,
    pub language: String,
    pub turbo_mode: bool,
}

/// Retourne le dossier de téléchargement par défaut
fn default_download_dir() -> String {
    let base = dirs_next::download_dir()
        .or_else(dirs_next::document_dir)
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    base.join("TelVid-Vizane").to_string_lossy().to_string()
}

/// Retourne le dossier de téléchargement actuel et le crée si nécessaire
#[tauri::command]
pub fn get_download_dir() -> Result<String, String> {
    let path = db::get_setting("download_path")
        .filter(|p| !p.is_empty())
        .unwrap_or_else(default_download_dir);

    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Impossible de créer le dossier : {}", e))?;

    Ok(path)
}

/// Sauvegarde le dossier de téléchargement
#[tauri::command]
pub fn set_download_dir(path: String) -> Result<String, String> {
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Impossible de créer le dossier : {}", e))?;
    db::set_setting("download_path", &path).map_err(|e| e.to_string())?;
    Ok(path)
}

/// Ouvre le dossier de téléchargement dans l'explorateur
#[tauri::command]
pub fn open_download_dir() -> Result<(), String> {
    let path = get_download_dir()?;
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Retourne tous les settings
#[tauri::command]
pub fn get_settings() -> AppSettings {
    AppSettings {
        download_path:     db::get_setting("download_path").unwrap_or_default(),
        always_ask_folder: db::get_setting("always_ask_folder").map(|v| v == "true").unwrap_or(false),
        language:          db::get_setting("language").unwrap_or_else(|| "fr".into()),
        turbo_mode:        db::get_setting("turbo_mode").map(|v| v == "true").unwrap_or(false),
    }
}

/// Sauvegarde un setting
#[tauri::command]
pub fn save_setting(key: String, value: String) -> Result<(), String> {
    db::set_setting(&key, &value).map_err(|e| e.to_string())
}
