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

#[derive(Debug, Clone)]
struct LicenseData {
    license_type: String,
    expires_at: Option<u64>,
    machine_id: String,
    original_key_hash: String,
}

// ─── Chemins fichiers ─────────────────────────────────────────────────────────

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

fn get_used_keys_path() -> std::path::PathBuf {
    get_app_data_dir().join("used_keys.txt")
}

// ─── Machine ID ───────────────────────────────────────────────────────────────

fn get_machine_id() -> String {
    let path = get_machine_id_path();
    
    // Si le fichier machine.id existe, le lire
    if let Ok(content) = std::fs::read_to_string(&path) {
        let content = content.trim();
        if !content.is_empty() && content.len() >= 16 {
            return content.to_string();
        }
    }
    
    // Générer un nouvel ID machine unique
    let machine_id = generate_machine_id();
    
    // Sauvegarder pour persistance
    if let Err(e) = std::fs::write(&path, &machine_id) {
        eprintln!("Warning: Could not save machine ID: {}", e);
    }
    
    machine_id
}

fn generate_machine_id() -> String {
    let mut hasher = DefaultHasher::new();
    
    // Combine plusieurs sources pour créer un ID unique
    if let Ok(hostname) = hostname::get() {
        hostname.to_string_lossy().to_string().hash(&mut hasher);
    }
    
    #[cfg(target_os = "linux")]
    if let Ok(uuid) = std::fs::read_to_string("/sys/class/dmi/id/product_uuid") {
        uuid.trim().hash(&mut hasher);
    }
    
    #[cfg(target_os = "windows")]
    {
        // Utiliser des informations Windows
        if let Ok(computer_name) = std::env::var("COMPUTERNAME") {
            computer_name.hash(&mut hasher);
        }
        if let Ok(user) = std::env::var("USERNAME") {
            user.hash(&mut hasher);
        }
    }
    
    // Timestamp d'installation
    let install_time = std::fs::metadata(".")
        .and_then(|m| m.created())
        .or_else(|_| std::fs::metadata(".").and_then(|m| m.modified()))
        .map(|t| t.duration_since(UNIX_EPOCH).unwrap().as_secs())
        .unwrap_or(0);
    install_time.hash(&mut hasher);
    
    format!("{:016x}-{:08x}", hasher.finish(), std::process::id())
}

// ─── Temps ────────────────────────────────────────────────────────────────────

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

// ─── Hashing ──────────────────────────────────────────────────────────────────

fn hash_key(key: &str) -> String {
    let mut hasher = DefaultHasher::new();
    key.to_uppercase().hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn generate_signature(payload: &str) -> String {
    let secret = "telvid-vizane-secret-2024-v2";
    let mut hasher = DefaultHasher::new();
    format!("{}:{}", payload, secret).hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn verify_signature(payload: &str, signature: &str) -> bool {
    generate_signature(payload) == signature
}

// ─── Lecture licence ───────────────────────────────────────────────────────────

fn read_license() -> Option<LicenseData> {
    let path = get_license_path();
    if !path.exists() {
        return None;
    }

    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return None,
    };

    let parts: Vec<&str> = content.trim().splitn(2, ':').collect();
    if parts.len() != 2 {
        return None;
    }

    let payload = parts[0];
    let signature = parts[1];

    if !verify_signature(payload, signature) {
        eprintln!("Invalid license signature!");
        return None;
    }

    // Parse: "type:expiry:machine_id:key_hash"
    let license_parts: Vec<&str> = payload.split(':').collect();
    if license_parts.len() < 4 {
        return None;
    }

    let license_type = license_parts[0].to_string();
    let expiry_timestamp: u64 = license_parts[1].parse().unwrap_or(0);
    let machine_id = license_parts[2].to_string();
    let original_key_hash = license_parts[3].to_string();

    // Vérifie expiration
    if expiry_timestamp > 0 && expiry_timestamp <= current_timestamp() {
        eprintln!("License expired!");
        return None;
    }

    // Vérifie machine
    let current_machine = get_machine_id();
    if !machine_id.is_empty() && machine_id != current_machine {
        eprintln!("License is for a different machine!");
        return None;
    }

    Some(LicenseData {
        license_type,
        expires_at: if expiry_timestamp == 0 { None } else { Some(expiry_timestamp) },
        machine_id,
        original_key_hash,
    })
}

// ─── Statut Premium ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn check_premium_status() -> PremiumStatus {
    let machine_id = get_machine_id();
    
    match read_license() {
        Some(license) => {
            let days_remaining = calculate_days_remaining(license.expires_at);
            let expiry_str = license.expires_at.map(|ts| {
                chrono::DateTime::from_timestamp(ts as i64, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default()
            });

            PremiumStatus {
                is_premium: true,
                max_resolution: "unlimited".to_string(),
                turbo_mode: true,
                concurrent_downloads: 5,
                expires_at: expiry_str,
                license_type: license.license_type.clone(),
                days_remaining,
                machine_id,
            }
        }
        None => {
            PremiumStatus {
                is_premium: false,
                max_resolution: "480p".to_string(),
                turbo_mode: false,
                concurrent_downloads: 2,
                expires_at: None,
                license_type: "free".to_string(),
                days_remaining: 0,
                machine_id,
            }
        }
    }
}

fn calculate_days_remaining(expires_at: Option<u64>) -> i32 {
    match expires_at {
        None => -1, // Illimité
        Some(ts) => {
            let now = current_timestamp();
            if ts <= now {
                0
            } else {
                ((ts - now) / (24 * 60 * 60)) as i32
            }
        }
    }
}

// ─── Vérification code utilisé ─────────────────────────────────────────────────

fn is_demo_key_used(key_hash: &str) -> bool {
    let path = get_used_keys_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        content.lines().any(|line| line.trim() == key_hash)
    } else {
        false
    }
}

fn mark_key_as_used(key_hash: &str) -> Result<(), String> {
    let path = get_used_keys_path();
    let mut content = String::new();
    
    if path.exists() {
        content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    }
    
    if !content.is_empty() && !content.ends_with('\n') {
        content.push('\n');
    }
    content.push_str(key_hash);
    content.push('\n');
    
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Activation ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn activate_license(license_key: String) -> ActivationResult {
    let machine_id = get_machine_id();
    let current_status = check_premium_status();
    
    if current_status.is_premium {
        return ActivationResult {
            success: false,
            message: "Vous avez déjà une licence active.".to_string(),
            status: current_status,
        };
    }

    let license_key = license_key.trim().to_uppercase();
    
    if license_key.is_empty() {
        return ActivationResult {
            success: false,
            message: "La clé de licence ne peut pas être vide.".to_string(),
            status: current_status,
        };
    }

    let (license_type, duration_days) = match parse_license_key(&license_key) {
        (Some(t), d) => (t, d),
        (None, _) => {
            return ActivationResult {
                success: false,
                message: "Clé de licence invalide. Vérifiez et réessayez.".to_string(),
                status: current_status,
            };
        }
    };

    let key_hash = hash_key(&license_key);

    // Pour les clés démo, vérifier si déjà utilisée
    if license_type == "demo" && is_demo_key_used(&key_hash) {
        return ActivationResult {
            success: false,
            message: "Cette clé démo a déjà été utilisée sur cette machine.".to_string(),
            status: current_status,
        };
    }

    let expiry_timestamp = if duration_days == 0 {
        0
    } else {
        current_timestamp() + (duration_days as u64 * 24 * 60 * 60)
    };

    let payload = format!("{}:{}:{}:{}", license_type, expiry_timestamp, machine_id, key_hash);
    let signature = generate_signature(&payload);
    let license_content = format!("{}:{}", payload, signature);

    let license_path = get_license_path();
    if let Err(e) = std::fs::write(&license_path, &license_content) {
        return ActivationResult {
            success: false,
            message: format!("Erreur lors de l'activation: {}", e),
            status: current_status,
        };
    }

    if license_type == "demo" {
        let _ = mark_key_as_used(&key_hash);
    }

    let new_status = check_premium_status();
    
    let message = if license_type == "demo" {
        format!("Licence démo activée ! {} jours restants.", new_status.days_remaining)
    } else {
        "Licence Premium activée avec succès !".to_string()
    };

    ActivationResult {
        success: true,
        message,
        status: new_status,
    }
}

// ─── Désactivation ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn deactivate_license() -> Result<bool, String> {
    let license_path = get_license_path();
    if license_path.exists() {
        std::fs::remove_file(&license_path).map_err(|e| format!("Erreur: {}", e))?;
    }
    Ok(true)
}

// ─── Génération clé démo ───────────────────────────────────────────────────────

#[tauri::command]
pub fn generate_demo_license(days: u32) -> String {
    let demo_type = "demo";
    let expiry = current_timestamp() + ((days as u64) * 24 * 60 * 60);
    let machine_id = get_machine_id();
    let key_hash = format!("DEMO-{:016x}", current_timestamp());
    
    let payload = format!("{}:{}:{}:{}", demo_type, expiry, machine_id, key_hash);
    let signature = generate_signature(&payload);
    format!("{}:{}", payload, signature)
}

// ─── Info licence ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_license_info() -> Result<PremiumStatus, String> {
    Ok(check_premium_status())
}

// ─── Parsing des clés ──────────────────────────────────────────────────────────

fn parse_license_key(key: &str) -> (Option<String>, u32) {
    let clean_key = key.replace('-', "").replace(' ', "").replace('_', "").to_uppercase();
    
    // Format démo: DEMO, DEMO7, DEMO30
    if clean_key.starts_with("DEMO") {
        let days = if clean_key.len() > 4 {
            clean_key[4..]
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect::<String>()
                .parse()
                .unwrap_or(7)
        } else {
            7
        };
        return (Some("demo".to_string()), days.min(30));
    }
    
    // Format premium: PREM, PREM365, FULL
    if clean_key.starts_with("PREM") || clean_key.starts_with("FULL") {
        let days = if clean_key.len() > 4 {
            clean_key[4..]
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect::<String>()
                .parse()
                .unwrap_or(365)
        } else {
            365
        };
        return (Some("premium".to_string()), days);
    }
    
    // Clé 16-32 caractères alphanumériques = premium à vie
    if clean_key.len() >= 16 && clean_key.len() <= 32 && clean_key.chars().all(|c| c.is_alphanumeric()) {
        return (Some("premium".to_string()), 0);
    }
    
    (None, 0)
}
