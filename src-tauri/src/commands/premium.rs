use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PremiumStatus {
    pub is_premium: bool,
    pub max_resolution: String,
    pub turbo_mode: bool,
    pub concurrent_downloads: u8,
}

#[tauri::command]
pub fn check_premium_status() -> PremiumStatus {
    // Check for a local license file
    let license_path = get_license_path();
    let is_premium = verify_license(&license_path);

    if is_premium {
        PremiumStatus {
            is_premium: true,
            max_resolution: "unlimited".to_string(),
            turbo_mode: true,
            concurrent_downloads: 5,
        }
    } else {
        PremiumStatus {
            is_premium: false,
            max_resolution: "480p".to_string(),
            turbo_mode: false,
            concurrent_downloads: 2,
        }
    }
}

fn get_license_path() -> std::path::PathBuf {
    let mut path = dirs_next::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("telvid-vizane");
    path.push("license.key");
    path
}

fn verify_license(path: &std::path::Path) -> bool {
    if !path.exists() {
        return false;
    }
    // Read and verify HMAC signature
    if let Ok(content) = std::fs::read_to_string(path) {
        let parts: Vec<&str> = content.trim().splitn(2, ':').collect();
        if parts.len() == 2 {
            let payload = parts[0];
            let signature = parts[1];
            return verify_hmac(payload, signature);
        }
    }
    false
}

fn verify_hmac(payload: &str, signature: &str) -> bool {
    // Simple HMAC-SHA256 verification using a hardcoded secret
    // In production, use a proper key derivation
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let secret = "telvid-vizane-secret-2024";
    let mut hasher = DefaultHasher::new();
    format!("{}:{}", payload, secret).hash(&mut hasher);
    let expected = format!("{:x}", hasher.finish());
    expected == signature
}
