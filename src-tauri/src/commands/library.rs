use crate::db::{self, DownloadedVideo};
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

#[tauri::command]
pub fn get_library() -> Result<Vec<DownloadedVideo>, String> {
    db::get_all_videos().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_video(id: String) -> Result<(), String> {
    let file_path = db::delete_video_by_id(&id).map_err(|e| e.to_string())?;
    if !file_path.is_empty() {
        let _ = std::fs::remove_file(&file_path);
        let thumb = format!("{}.jpg", file_path.rsplit_once('.').map(|(b, _)| b).unwrap_or(&file_path));
        let _ = std::fs::remove_file(&thumb);
    }
    Ok(())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let folder = std::path::Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or(path);
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer").arg(&folder).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&folder).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&folder).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Payload émis pendant le refresh ─────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshProgress {
    pub current: usize,
    pub total: usize,
    pub title: String,
    pub done: bool,
}

// ─── Refresh des métadonnées des anciennes entrées ────────────────────────────
#[tauri::command]
pub async fn refresh_library_metadata(app: AppHandle) -> Result<usize, String> {
    let incomplete = db::get_incomplete_videos().map_err(|e| e.to_string())?;
    let total = incomplete.len();

    if total == 0 {
        let _ = app.emit("refresh-progress", RefreshProgress {
            current: 0, total: 0, title: "Tout est à jour".into(), done: true,
        });
        return Ok(0);
    }

    let ytdlp = get_sidecar_path("yt-dlp");
    let mut updated = 0usize;

    for (idx, (id, title_or_url, file_path, source_url)) in incomplete.iter().enumerate() {
        // Priorité : source_url stockée > titre si c'est une URL
        let url = if !source_url.is_empty() {
            source_url.clone()
        } else if title_or_url.starts_with("http") {
            title_or_url.clone()
        } else {
            // Pas d'URL disponible — essaie de trouver via recherche yt-dlp
            let search_url = format!("ytsearch1:{}", title_or_url);
            search_url
        };

        let _ = app.emit("refresh-progress", RefreshProgress {
            current: idx + 1,
            total,
            title: format!("Récupération : {}", &url[..url.len().min(50)]),
            done: false,
        });

        // Appel yt-dlp --dump-json
        let output = tokio::process::Command::new(&ytdlp)
            .args(["--dump-json", "--no-playlist", &url])
            .output()
            .await;

        let json = match output {
            Ok(o) if o.status.success() => {
                match serde_json::from_slice::<serde_json::Value>(&o.stdout) {
                    Ok(j) => j,
                    Err(_) => continue,
                }
            }
            _ => continue,
        };

        let new_title = json["title"].as_str().unwrap_or("").to_string();
        let uploader  = json["uploader"]
            .as_str()
            .or_else(|| json["channel"].as_str())
            .or_else(|| json["creator"].as_str())
            .unwrap_or("")
            .to_string();
        let duration  = json["duration"].as_f64().unwrap_or(0.0) as u64;
        let platform  = detect_platform(&url);
        // URL réelle de la vidéo (utile si on est passé par ytsearch)
        let real_url  = json["webpage_url"].as_str().unwrap_or(&url).to_string();

        // Essaie d'abord de télécharger la miniature localement
        let thumb_path = download_thumbnail(&ytdlp, &real_url, file_path).await;

        // Si le téléchargement local échoue, utilise l'URL web directement
        let final_thumb = if !thumb_path.is_empty() {
            thumb_path
        } else {
            json["thumbnail"].as_str().unwrap_or("").to_string()
        };

        // Taille du fichier réel
        let file_size_mb = std::fs::metadata(file_path)
            .map(|m| m.len() as f32 / (1024.0 * 1024.0))
            .unwrap_or(0.0);

        if !new_title.is_empty() {
            let _ = db::update_video_metadata(
                id, &new_title, &uploader, &final_thumb,
                duration, &platform, file_size_mb,
            );
            // Met à jour source_url avec la vraie URL trouvée
            let _ = db::update_source_url(id, &real_url);
            updated += 1;
        }
    }

    let _ = app.emit("refresh-progress", RefreshProgress {
        current: total,
        total,
        title: format!("{} vidéo(s) mise(s) à jour", updated),
        done: true,
    });

    let _ = app.emit("library-updated", ());
    Ok(updated)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn get_sidecar_path(name: &str) -> std::path::PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let dir = exe.parent().unwrap_or(std::path::Path::new("."));
    let candidate = dir.join(name);
    if candidate.exists() { return candidate; }
    std::path::PathBuf::from(name)
}

fn detect_platform(url: &str) -> String {
    if url.contains("youtube.com") || url.contains("youtu.be") { "youtube".into() }
    else if url.contains("tiktok.com")   { "tiktok".into() }
    else if url.contains("facebook.com") { "facebook".into() }
    else if url.contains("instagram.com"){ "instagram".into() }
    else if url.contains("twitter.com") || url.contains("x.com") { "twitter".into() }
    else if url.contains("twitch.tv")    { "twitch".into() }
    else if url.contains("dailymotion.com") { "dailymotion".into() }
    else if url.contains("vimeo.com")    { "vimeo".into() }
    else                                  { "other".into() }
}

async fn download_thumbnail(ytdlp: &std::path::Path, url: &str, file_path: &str) -> String {
    // Dossier de sortie = dossier du fichier vidéo
    let output_dir = std::path::Path::new(file_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());

    let output_template = format!("{}/%(title)s.%(ext)s", output_dir);

    let result = tokio::process::Command::new(ytdlp)
        .args([
            "--write-thumbnail",
            "--convert-thumbnails", "jpg",
            "--skip-download",          // ne re-télécharge pas la vidéo
            "--no-playlist",
            "--output", &output_template,
            url,
        ])
        .output()
        .await;

    if result.is_err() { return String::new(); }

    // Cherche le .jpg dans le dossier
    if let Ok(entries) = std::fs::read_dir(&output_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().and_then(|e| e.to_str()) == Some("jpg") {
                return p.to_string_lossy().to_string();
            }
        }
    }
    String::new()
}
