use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PremiumStatus {
    pub is_premium: bool,
    pub max_resolution: String,
    pub turbo_mode: bool,
    pub concurrent_downloads: u8,
    pub expires_at: Option<String>,
    pub license_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivationResult {
    pub success: bool,
    pub message: String,
    pub status: PremiumStatus,
}

/// Retourne le chemin du dossier de données de l'app
fn get_app_data_dir() -> std::path::PathBuf {
    let mut path = dirs_next::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("telvid-vizane");
    std::fs::create_dir_all(&path).ok();
    path
}

/// Retourne le chemin du fichier de licence
fn get_license_path() -> std::path::PathBuf {
    get_app_data_dir().join("license.key")
}

/// Génère la signature HMAC-SHA256 pour un payload
fn generate_signature(payload: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let secret = "telvid-vizane-secret-2024";
    let mut hasher = DefaultHasher::new();
    format!("{}:{}", payload, secret).hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// Vérifie la signature HMAC
fn verify_signature(payload: &str, signature: &str) -> bool {
    generate_signature(payload) == signature
}

/// Vérifie si la licence est valide et non expirée
fn verify_license(path: &std::path::Path) -> Option<LicenseData> {
    if !path.exists() {
        return None;
    }

    if let Ok(content) = std::fs::read_to_string(path) {
        let parts: Vec<&str> = content.trim().splitn(2, ':').collect();
        if parts.len() == 2 {
            let payload = parts[0];
            let signature = parts[1];
            
            if verify_signature(payload, signature) {
                // Parse le payload: "type:timestamp"
                let license_parts: Vec<&str> = payload.split(':').collect();
                if license_parts.len() >= 2 {
                    let license_type = license_parts[0].to_string();
                    let expiry_timestamp: u64 = license_parts[1].parse().unwrap_or(0);
                    
                    // Vérifie l'expiration (0 = jamais)
                    if expiry_timestamp == 0 || expiry_timestamp > current_timestamp() {
                        return Some(LicenseData {
                            license_type,
                            expires_at: if expiry_timestamp == 0 {
                                None
                            } else {
                                Some(expiry_timestamp)
                            },
                        });
                    }
                }
            }
        }
    }
    None
}

#[derive(Debug, Clone)]
struct LicenseData {
    license_type: String,
    expires_at: Option<u64>,
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

/// Retourne le statut premium actuel
#[tauri::command]
pub fn check_premium_status() -> PremiumStatus {
    let license_path = get_license_path();
    
    match verify_license(&license_path) {
        Some(license) => {
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
                license_type: license.license_type,
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
            }
        }
    }
}

/// Active une licence avec une clé
#[tauri::command]
pub fn activate_license(license_key: String) -> ActivationResult {
    let license_key = license_key.trim().to_uppercase();
    
    if license_key.is_empty() {
        return ActivationResult {
            success: false,
            message: "La clé de licence ne peut pas être vide".to_string(),
            status: check_premium_status(),
        };
    }

    // Vérifie différents formats de clé
    let (license_type, duration_days) = parse_license_key(&license_key);
    
    if license_type.is_none() {
        return ActivationResult {
            success: false,
            message: "Clé de licence invalide. Vérifiez et réessayez.".to_string(),
            status: check_premium_status(),
        };
    }

    let license_type = license_type.unwrap();
    let expiry_timestamp = if duration_days == 0 {
        0 // Jamais expiré
    } else {
        current_timestamp() + (duration_days as u64 * 24 * 60 * 60)
    };

    // Crée le payload et la signature
    let payload = format!("{}:{}", license_type, expiry_timestamp);
    let signature = generate_signature(&payload);
    let license_content = format!("{}:{}", payload, signature);

    // Écrit le fichier de licence
    let license_path = get_license_path();
    match std::fs::write(&license_path, license_content) {
        Ok(_) => {
            let expiry_str = if expiry_timestamp == 0 {
                "jamais".to_string()
            } else {
                format!("{} jours", duration_days)
            };
            
            let message = if license_type == "demo" {
                format!("Licence démo activée (valide {}), expire le {}", expiry_str,
                    chrono::DateTime::from_timestamp(expiry_timestamp as i64, 0)
                        .map(|dt| dt.format("%d/%m/%Y").to_string())
                        .unwrap_or_default())
            } else {
                "Licence Premium activée avec succès !".to_string()
            };
            
            ActivationResult {
                success: true,
                message,
                status: check_premium_status(),
            }
        }
        Err(e) => ActivationResult {
            success: false,
            message: format!("Erreur lors de l'activation: {}", e),
            status: check_premium_status(),
        },
    }
}

/// Désactive la licence premium
#[tauri::command]
pub fn deactivate_license() -> Result<bool, String> {
    let license_path = get_license_path();
    if license_path.exists() {
        std::fs::remove_file(&license_path)
            .map_err(|e| format!("Erreur: {}", e))?;
    }
    Ok(true)
}

/// Génère une clé de licence démo (pour tests uniquement)
#[tauri::command]
pub fn generate_demo_license(days: u32) -> String {
    let demo_type = "demo";
    let expiry = if days == 0 {
        0
    } else {
        current_timestamp() + (days as u64 * 24 * 60 * 60)
    };
    
    let payload = format!("{}:{}", demo_type, expiry);
    let signature = generate_signature(&payload);
    format!("{}:{}", payload, signature)
}

/// Obtient les informations de la licence actuelle
#[tauri::command]
pub fn get_license_info() -> Result<PremiumStatus, String> {
    Ok(check_premium_status())
}

// ─── Parsing des clés de licence ──────────────────────────────────────────────

enum LicenseFormat {
    Standard,      // XXXX-XXXX-XXXX-XXXX
    Extended,      // XXXX-XXXX-XXXX-XXXX-XXXX
    Demo,          // DEMO-XXXX-XXXX
}

fn parse_license_key(key: &str) -> (Option<String>, u32) {
    // Nettoie la clé
    let clean_key = key.replace('-', "").replace(' ', "").to_uppercase();
    
    // Format démo: DEMO-XXXX-XXXX ou juste DEMO
    if clean_key.starts_with("DEMO") {
        // Extrait le nombre de jours après DEMO
        let days = if clean_key.len() > 4 {
            clean_key[4..].parse().unwrap_or(7)
        } else {
            7 // Par défaut 7 jours
        };
        return (Some("demo".to_string()), days);
    }
    
    // Format premium standard: clé de 16-20 caractères alphanumériques
    if clean_key.len() >= 12 && clean_key.len() <= 24 {
        // Vérifie que ce sont des caractères valides
        if clean_key.chars().all(|c| c.is_alphanumeric()) {
            // Premium à vie
            return (Some("premium".to_string()), 0);
        }
    }
    
    // Format premium mensuel: PREMIUM-XXXX-XXXX
    if clean_key.starts_with("PREM") || clean_key.starts_with("FULL") {
        return (Some("premium".to_string()), 365);
    }
    
    (None, 0)
}
