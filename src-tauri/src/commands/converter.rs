use std::process::Command;
use tauri::{AppHandle, Emitter};

fn get_sidecar_path(name: &str) -> std::path::PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let dir = exe.parent().unwrap_or(std::path::Path::new("."));
    let candidate = dir.join(name);
    if candidate.exists() {
        return candidate;
    }
    std::path::PathBuf::from(name)
}

#[tauri::command]
pub fn convert_to_mp4(input_path: String, app: AppHandle) -> Result<String, String> {
    let ffmpeg = get_sidecar_path("ffmpeg");
    let output_path = input_path
        .rsplit_once('.')
        .map(|(base, _)| format!("{}.mp4", base))
        .unwrap_or_else(|| format!("{}.mp4", input_path));

    let _ = app.emit("conversion-progress", serde_json::json!({
        "input": input_path,
        "status": "converting",
        "percent": 0
    }));

    let output = Command::new(&ffmpeg)
        .args([
            "-i", &input_path,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-movflags", "+faststart",
            "-y",
            &output_path,
        ])
        .output()
        .map_err(|e| format!("FFmpeg not found: {}", e))?;

    if output.status.success() {
        let _ = app.emit("conversion-progress", serde_json::json!({
            "input": input_path,
            "status": "done",
            "percent": 100,
            "output": output_path
        }));
        Ok(output_path)
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg error: {}", err))
    }
}

#[tauri::command]
pub fn extract_audio(input_path: String, quality: u32, app: AppHandle) -> Result<String, String> {
    let ffmpeg = get_sidecar_path("ffmpeg");
    let output_path = input_path
        .rsplit_once('.')
        .map(|(base, _)| format!("{}.mp3", base))
        .unwrap_or_else(|| format!("{}.mp3", input_path));

    let bitrate = match quality {
        128 => "128k",
        192 => "192k",
        _ => "320k",
    };

    let _ = app.emit("conversion-progress", serde_json::json!({
        "input": input_path,
        "status": "converting",
        "percent": 0
    }));

    let output = Command::new(&ffmpeg)
        .args([
            "-i", &input_path,
            "-vn",
            "-b:a", bitrate,
            "-y",
            &output_path,
        ])
        .output()
        .map_err(|e| format!("FFmpeg not found: {}", e))?;

    if output.status.success() {
        let _ = app.emit("conversion-progress", serde_json::json!({
            "input": input_path,
            "status": "done",
            "percent": 100,
            "output": output_path
        }));
        Ok(output_path)
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg error: {}", err))
    }
}
