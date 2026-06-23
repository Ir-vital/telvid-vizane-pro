use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::queue::{DownloadJob, SharedQueue, enqueue};
use crate::db;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FormatOption {
    pub id: String,
    pub ext: String,
    pub resolution: String,
    pub filesize: Option<u64>,
    pub fps: Option<f32>,
    pub codec: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    pub title: String,
    pub uploader: String,
    pub thumbnail: String,
    pub duration_seconds: u64,
    pub formats: Vec<FormatOption>,
    pub platform: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadConfig {
    pub url: String,
    pub format_id: String,
    pub output_path: String,
    pub priority: u8,
    pub turbo_mode: bool,
    pub auto_convert_mp4: bool,
    pub extract_audio: bool,
    pub title: String,
    pub uploader: String,
    pub thumbnail: String,
    pub duration_seconds: u64,
    pub platform: String,
    pub quality: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressPayload {
    pub download_id: String,
    pub percent: f32,
    pub speed_mbps: f32,
    pub eta_seconds: u32,
    pub status: String,
    pub status_label: String,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    else if url.contains("facebook.com") || url.contains("fb.watch") { "facebook".into() }
    else if url.contains("instagram.com") { "instagram".into() }
    else if url.contains("twitter.com") || url.contains("x.com") { "twitter".into() }
    else if url.contains("twitch.tv")    { "twitch".into() }
    else if url.contains("dailymotion.com") { "dailymotion".into() }
    else if url.contains("vimeo.com")    { "vimeo".into() }
    else                                  { "other".into() }
}

/// Parse une ligne yt-dlp : "[download]  45.2% of 123MiB at 2.3MiB/s ETA 00:32"
fn parse_ytdlp_progress(line: &str) -> Option<(f32, f32, u32)> {
    if !line.contains("[download]") || !line.contains('%') { return None; }
    let percent = line.split('%').next()
        .and_then(|s| s.split_whitespace().last())
        .and_then(|s| s.parse::<f32>().ok())?;
    let speed_mbps = if let Some(pos) = line.find(" at ") {
        let s = line[pos + 4..].split_whitespace().next().unwrap_or("0");
        if s.contains("MiB/s") { s.replace("MiB/s", "").trim().parse::<f32>().unwrap_or(0.0) }
        else if s.contains("KiB/s") { s.replace("KiB/s", "").trim().parse::<f32>().unwrap_or(0.0) / 1024.0 }
        else { 0.0 }
    } else { 0.0 };
    let eta = if let Some(pos) = line.find("ETA ") {
        parse_eta(line[pos + 4..].split_whitespace().next().unwrap_or("0:00"))
    } else { 0 };
    Some((percent.min(100.0), speed_mbps, eta))
}

fn parse_eta(s: &str) -> u32 {
    let p: Vec<&str> = s.split(':').collect();
    match p.len() {
        2 => p[0].parse::<u32>().unwrap_or(0) * 60 + p[1].parse::<u32>().unwrap_or(0),
        3 => p[0].parse::<u32>().unwrap_or(0) * 3600 + p[1].parse::<u32>().unwrap_or(0) * 60 + p[2].parse::<u32>().unwrap_or(0),
        _ => 0,
    }
}

fn emit_progress(app: &AppHandle, id: &str, percent: f32, speed: f32, eta: u32, status: &str, label: &str) {
    let _ = app.emit("download-progress", ProgressPayload {
        download_id: id.to_string(),
        percent, speed_mbps: speed, eta_seconds: eta,
        status: status.to_string(),
        status_label: label.to_string(),
    });
}

fn sanitize_filename(title: &str) -> String {
    title.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_")
}

fn find_downloaded_file(output_path: &str, safe_title: &str) -> String {
    let exts = ["mp4", "webm", "mkv", "avi", "mov", "flv"];
    for ext in &exts {
        let c = format!("{}/{}.{}", output_path, safe_title, ext);
        if std::path::Path::new(&c).exists() { return c; }
    }
    if let Ok(entries) = std::fs::read_dir(output_path) {
        let mut candidates: Vec<(std::time::SystemTime, String)> = entries.flatten()
            .filter_map(|e| {
                let p = e.path();
                let ext = p.extension()?.to_str()?.to_lowercase();
                if exts.contains(&ext.as_str()) {
                    Some((e.metadata().ok()?.modified().ok()?, p.to_string_lossy().to_string()))
                } else { None }
            }).collect();
        candidates.sort_by(|a, b| b.0.cmp(&a.0));
        if let Some((_, p)) = candidates.into_iter().next() { return p; }
    }
    String::new()
}

fn file_size_mb(path: &str) -> f32 {
    std::fs::metadata(path).map(|m| m.len() as f32 / (1024.0 * 1024.0)).unwrap_or(0.0)
}

async fn save_to_library(app: &AppHandle, id: &str, config: &DownloadConfig, path: &str, fmt: &str, size: f32) {
    let video = db::DownloadedVideo {
        id: id.to_string(), title: config.title.clone(), uploader: config.uploader.clone(),
        thumbnail_path: config.thumbnail.clone(), file_path: path.to_string(),
        duration_seconds: config.duration_seconds, file_size_mb: size,
        downloaded_at: chrono::Local::now().to_rfc3339(),
        platform: config.platform.clone(), format: fmt.to_string(),
        quality: config.quality.clone(), source_url: config.url.clone(),
    };
    let _ = db::insert_video(&video);
    let _ = app.emit("library-updated", ());
}

// ─── Commandes Tauri ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_video_info(url: String) -> Result<VideoInfo, String> {
    let ytdlp = get_sidecar_path("yt-dlp");
    let out = Command::new(&ytdlp)
        .args(["--dump-json", "--no-playlist", &url])
        .output()
        .map_err(|e| format!("yt-dlp introuvable : {}", e))?;

    if !out.status.success() {
        return Err(format!("yt-dlp error: {}", String::from_utf8_lossy(&out.stderr)));
    }

    let json: serde_json::Value = serde_json::from_slice(&out.stdout)
        .map_err(|e| format!("JSON parse error: {}", e))?;

    Ok(VideoInfo {
        title:    json["title"].as_str().unwrap_or("").to_string(),
        uploader: json["uploader"].as_str()
            .or_else(|| json["channel"].as_str())
            .or_else(|| json["creator"].as_str())
            .unwrap_or("").to_string(),
        thumbnail:        json["thumbnail"].as_str().unwrap_or("").to_string(),
        duration_seconds: json["duration"].as_f64().unwrap_or(0.0) as u64,
        formats: vec![
            FormatOption { id: "bestvideo[height<=1080]+bestaudio/best[height<=1080]".into(), ext: "mp4".into(), resolution: "1080p".into(), filesize: None, fps: None, codec: "h264".into() },
            FormatOption { id: "bestvideo[height<=480]+bestaudio/best[height<=480]".into(),   ext: "mp4".into(), resolution: "480p".into(),  filesize: None, fps: None, codec: "h264".into() },
            FormatOption { id: "bestaudio/best".into(), ext: "mp3".into(), resolution: "audio".into(), filesize: None, fps: None, codec: "mp3".into() },
        ],
        platform: detect_platform(&url),
    })
}

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    config: DownloadConfig,
    queue: tauri::State<'_, SharedQueue>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();

    // Enregistre le job dans la queue
    enqueue(&queue, DownloadJob {
        id: id.clone(), url: config.url.clone(), format_id: config.format_id.clone(),
        output_path: config.output_path.clone(), priority: config.priority,
        turbo_mode: config.turbo_mode, auto_convert_mp4: config.auto_convert_mp4,
        extract_audio: config.extract_audio,
        status: crate::queue::JobStatus::Queued,
    });

    emit_progress(&app, &id, 0.0, 0.0, 0, "queued", "En attente...");

    // Clone les handles pour le task — extrait les Arc avant le spawn
    let id_clone      = id.clone();
    let app_clone     = app.clone();
    let config_clone  = config.clone();
    let semaphore     = queue.semaphore.clone();
    let manager       = std::sync::Arc::clone(&*queue);

    tokio::spawn(async move {
        // ── Attend un slot disponible ──────────────────────────────────────
        // Si tous les slots sont pris, le task attend ici (bloqué mais non-bloquant)
        let _permit = semaphore.acquire().await;

        // Vérifie si le job a été annulé pendant l'attente
        if manager.is_cancelled(&id_clone) {
            return;
        }

        manager.update_status(&id_clone, crate::queue::JobStatus::Downloading);
        emit_progress(&app_clone, &id_clone, 2.0, 0.0, 0, "downloading", "Démarrage...");

        run_download(app_clone, id_clone.clone(), config_clone).await;

        // Le permit est relâché automatiquement ici (drop)
        manager.cleanup();
    });

    Ok(id)
}

#[tauri::command]
pub fn cancel_download(download_id: String, queue: tauri::State<'_, SharedQueue>) -> Result<(), String> {
    crate::queue::cancel_job(&queue, &download_id);
    Ok(())
}

// ─── Logique de téléchargement ────────────────────────────────────────────────

async fn run_download(app: AppHandle, id: String, config: DownloadConfig) {
    let ytdlp      = get_sidecar_path("yt-dlp");
    let ffmpeg     = get_sidecar_path("ffmpeg");
    let safe_title = sanitize_filename(&config.title);
    let out_tpl    = format!("{}/%(title)s.%(ext)s", config.output_path);

    // Nombre de fragments selon le mode
    // FREE : 4 fragments (raisonnable sans abuser)
    // TURBO : 16 fragments (accélération maximale)
    let fragments = if config.turbo_mode { "16" } else { "4" };

    if config.extract_audio {
        run_audio(&app, &id, &config, &ytdlp, &out_tpl, &safe_title, fragments).await;
    } else {
        run_video(&app, &id, &config, &ytdlp, &ffmpeg, &out_tpl, &safe_title, fragments).await;
    }
}

async fn run_audio(
    app: &AppHandle, id: &str, config: &DownloadConfig,
    ytdlp: &std::path::Path, out_tpl: &str, safe_title: &str, fragments: &str,
) {
    emit_progress(app, id, 3.0, 0.0, 0, "downloading", "Téléchargement audio...");

    let mut child = match tokio::process::Command::new(ytdlp)
        .args([
            "--format", "bestaudio/best",
            "--output", out_tpl,
            "--no-playlist",
            "--extract-audio", "--audio-format", "mp3", "--audio-quality", "0",
            "--concurrent-fragments", fragments,
            "--newline", "--progress",
            &config.url,
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => { emit_progress(app, id, 0.0, 0.0, 0, "error", &format!("Erreur : {}", e)); return; }
    };

    if let Some(stdout) = child.stdout.take() {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if let Some((pct, spd, eta)) = parse_ytdlp_progress(&line) {
                emit_progress(app, id, pct * 0.9, spd, eta, "downloading", "Téléchargement audio...");
            }
        }
    }

    if child.wait().await.map(|s| s.success()).unwrap_or(false) {
        emit_progress(app, id, 100.0, 0.0, 0, "done", "Terminé");
        let path = format!("{}/{}.mp3", config.output_path, safe_title);
        save_to_library(app, id, config, &path, "mp3", file_size_mb(&path)).await;
    } else {
        emit_progress(app, id, 0.0, 0.0, 0, "error", "Erreur de téléchargement");
    }
}

async fn run_video(
    app: &AppHandle, id: &str, config: &DownloadConfig,
    ytdlp: &std::path::Path, ffmpeg: &std::path::Path,
    out_tpl: &str, safe_title: &str, fragments: &str,
) {
    emit_progress(app, id, 3.0, 0.0, 0, "downloading", "Téléchargement vidéo...");

    let mut child = match tokio::process::Command::new(ytdlp)
        .args([
            "--format", &config.format_id,
            "--output", out_tpl,
            "--merge-output-format", "mp4",
            "--no-playlist",
            "--concurrent-fragments", fragments,
            "--newline", "--progress",
            &config.url,
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => { emit_progress(app, id, 0.0, 0.0, 0, "error", &format!("Erreur : {}", e)); return; }
    };

    if let Some(stdout) = child.stdout.take() {
        let mut lines = BufReader::new(stdout).lines();
        let mut label = "Téléchargement vidéo...".to_string();
        while let Ok(Some(line)) = lines.next_line().await {
            if line.contains("[Merger]") || line.contains("Merging") {
                label = "Fusion vidéo/audio...".to_string();
                emit_progress(app, id, 85.0, 0.0, 0, "converting", &label);
            } else if let Some((pct, spd, eta)) = parse_ytdlp_progress(&line) {
                emit_progress(app, id, 3.0 + pct * 0.78, spd, eta, "downloading", &label);
            }
        }
    }

    if !child.wait().await.map(|s| s.success()).unwrap_or(false) {
        emit_progress(app, id, 0.0, 0.0, 0, "error", "Erreur de téléchargement");
        return;
    }

    let downloaded = find_downloaded_file(&config.output_path, safe_title);
    if downloaded.is_empty() {
        emit_progress(app, id, 0.0, 0.0, 0, "error", "Fichier introuvable");
        return;
    }

    let final_path = if downloaded.ends_with(".mp4") {
        emit_progress(app, id, 100.0, 0.0, 0, "done", "Terminé");
        downloaded
    } else {
        emit_progress(app, id, 83.0, 0.0, 0, "converting", "Conversion MP4...");
        let mp4 = format!("{}/{}.mp4", config.output_path, safe_title);
        let ok = tokio::process::Command::new(ffmpeg)
            .args(["-i", &downloaded, "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", "-y", &mp4])
            .output().await
            .map(|o| o.status.success()).unwrap_or(false);
        if ok {
            let _ = std::fs::remove_file(&downloaded);
            emit_progress(app, id, 100.0, 0.0, 0, "done", "Terminé");
            mp4
        } else {
            emit_progress(app, id, 0.0, 0.0, 0, "error", "Erreur de conversion");
            return;
        }
    };

    save_to_library(app, id, config, &final_path, "mp4", file_size_mb(&final_path)).await;
}
