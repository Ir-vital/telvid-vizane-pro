use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::time::{SystemTime, UNIX_EPOCH};

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PremiumStatus {
    pub is_premium: bool,
    pub max_resolution: String,
    pub turbo_mode: bool,
    pub concurrent_downloads: u8,
    pub expires_at: Option<String>,
    pub license_type: String,
    pub days_remaining: i32,
    pub machine_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivationResult {
    pub success: bool,
    pub message: String,
    pub status: PremiumStatus,
}

// ─── Chemins ──────────────────────────────────────────────────────────────────

fn get_app_data_dir() -> std::path::PathBuf {
    let mut path = dirs_next::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("telvid-vizane");
    let _ = std::fs::create_dir_all(&path);
    path
}

fn get_license_path() -> std::path::PathBuf {
    get_app_data_dir().join("license.key")
}

fn get_machine_id_path() -> std::path::PathBuf {
    get_app_data_dir().join("machine.id")
}

// ─── Machine ID ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_machine_id() -> String {
    let path = get_machine_id_path();
    
    if let Ok(content) = std::fs::read_to_string(&path) {
        let content = content.trim();
        if !content.is_empty() && content.len() >= 8 {
            return content.to_string();
        }
    }
    
    let machine_id = generate_machine_id();
    let _ = std::fs::write(&path, &machine_id);
    machine_id
}

fn generate_machine_id() -> String {
    let mut hasher = DefaultHasher::new();
    
    #[cfg(target_os = "windows")]
    {
        if let Ok(name) = std::env::var("COMPUTERNAME") {
            name.hash(&mut hasher);
        }
        if let Ok(user) = std::env::var("USERNAME") {
            user.hash(&mut hasher);
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(uuid) = std::fs::read_to_string("/sys/class/dmi/id/product_uuid") {
            uuid.trim().hash(&mut hasher);
        }
    }
    
    format!("{:016x}", hasher.finish())
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

// ─── Hashing Simple ──────────────────────────────────────────────────────────

fn simple_hash(input: &str) -> String {
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn make_signature(data: &str) -> String {
    simple_hash(&format!("telvid-2024:{}", data))
}

fn check_signature(data: &str, sig: &str) -> bool {
    make_signature(data) == sig
}

// ─── Licence JSON ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct License {
    #[serde(rename = "type")]
    license_type: String,
    expiry: u64,
    machine_id: String,
    signature: String,
}

fn read_license_file() -> Option<License> {
    let path = get_license_path();
    if !path.exists() {
        return None;
    }

    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return None,
    };

    serde_json::from_str(&content).ok()
}

fn write_license_file(license: &License) -> std::io::Result<()> {
    let path = get_license_path();
    let content = serde_json::to_string_pretty(license).map_err(|e| {
        std::io::Error::new(std::io::ErrorKind::InvalidData, e)
    })?;
    std::fs::write(&path, content)
}

// ─── Statut Premium ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn check_premium_status() -> PremiumStatus {
    let machine_id = get_machine_id();
    
    match read_license_file() {
        Some(lic) => {
            // Vérifie signature
            let data = format!("{}:{}:{}", lic.license_type, lic.expiry, lic.machine_id);
            if !check_signature(&data, &lic.signature) {
                eprintln!("Invalid license signature!");
                return free_status(&machine_id);
            }
            
            // Vérifie expiration
            if lic.expiry > 0 && lic.expiry <= current_timestamp() {
                eprintln!("License expired!");
                return free_status(&machine_id);
            }
            
            // Vérifie machine
            if !lic.machine_id.is_empty() && lic.machine_id != machine_id {
                eprintln!("License for different machine!");
                return free_status(&machine_id);
            }
            
            let days = if lic.expiry == 0 {
                -1 // Illimité
            } else {
                ((lic.expiry - current_timestamp()) / 86400) as i32
            };
            
            PremiumStatus {
                is_premium: true,
                max_resolution: "unlimited".to_string(),
                turbo_mode: true,
                concurrent_downloads: 5,
                expires_at: if lic.expiry == 0 { None } else {
                    chrono::DateTime::from_timestamp(lic.expiry as i64, 0)
                        .map(|dt| dt.to_rfc3339())
                },
                license_type: lic.license_type,
                days_remaining: days.max(0),
                machine_id,
            }
        }
        None => free_status(&machine_id),
    }
}

fn free_status(machine_id: &str) -> PremiumStatus {
    PremiumStatus {
        is_premium: false,
        max_resolution: "480p".to_string(),
        turbo_mode: false,
        concurrent_downloads: 2,
        expires_at: None,
        license_type: "free".to_string(),
        days_remaining: 0,
        machine_id: machine_id.to_string(),
    }
}

// ─── Activation ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn activate_license(license_key: String) -> ActivationResult {
    let machine_id = get_machine_id();
    let current = check_premium_status();
    
    if current.is_premium {
        return ActivationResult {
            success: false,
            message: "Vous avez déjà une licence active.".to_string(),
            status: current,
        };
    }

    let key = license_key.trim().to_uppercase();
    if key.is_empty() {
        return ActivationResult {
            success: false,
            message: "Clé vide.".to_string(),
            status: current,
        };
    }

    // Parse: type:jours ou type|jours
    let parts: Vec<&str> = key.split(|c| c == ':' || c == '|').collect();
    if parts.len() < 2 {
        return ActivationResult {
            success: false,
            message: "Clé invalide.".to_string(),
            status: current,
        };
    }
    
    let lic_type = parts[0].to_lowercase();
    let days: u32 = parts[1].parse().unwrap_or(7);
    
    if lic_type != "demo" && lic_type != "premium" {
        return ActivationResult {
            success: false,
            message: "Type de clé inconnu.".to_string(),
            status: current,
        };
    }

    let expiry = if days == 0 {
        0 // Jamais
    } else {
        current_timestamp() + (days as u64 * 86400)
    };

    // Crée la licence
    let license = License {
        license_type: lic_type.clone(),
        expiry,
        machine_id: machine_id.clone(),
        signature: String::new(),
    };

    // Génère signature
    let data = format!("{}:{}:{}", license.license_type, license.expiry, license.machine_id);
    let signature = make_signature(&data);
    
    let license = License {
        signature,
        ..license
    };

    if let Err(e) = write_license_file(&license) {
        return ActivationResult {
            success: false,
            message: format!("Erreur: {}", e),
            status: current,
        };
    }

    let status = check_premium_status();
    let message = if lic_type == "demo" {
        format!("Licence démo activée ! {} jours.", status.days_remaining)
    } else {
        "Licence Premium activée !".to_string()
    };

    ActivationResult {
        success: true,
        message,
        status,
    }
}

// ─── Désactivation ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn deactivate_license() -> Result<bool, String> {
    let path = get_license_path();
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

// ─── Génération démo ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn generate_demo_license(days: u32) -> String {
    let d = if days == 0 { 7 } else { days.min(30) };
    format!("demo:{}", d)
}

// ─── Info ─────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_license_info() -> Result<PremiumStatus, String> {
    Ok(check_premium_status())
}

// ─── Génération pour vendeur ──────────────────────────────────────────────────

#[tauri::command]
pub fn generate_license_for_machine(
    machine_id: String,
    license_type: String,
    duration_days: u32,
) -> Result<String, String> {
    let lic_type = license_type.to_lowercase();
    if lic_type != "demo" && lic_type != "premium" {
        return Err("Type invalide".to_string());
    }
    let days = if duration_days == 0 { 365 } else { duration_days };
    Ok(format!("{}:{}", lic_type, days))
}
