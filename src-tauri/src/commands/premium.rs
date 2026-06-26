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

// ─── Hashing Simple (CRC32 déterministe) ──────────────────────────────────────

fn simple_hash(input: &str) -> String {
    // CRC32 déterministe
    let mut crc: u32 = 0xFFFFFFFF;
    for byte in input.bytes() {
        crc = crc32_table[((crc ^ byte as u32) & 0xFF) as usize] ^ (crc >> 8);
    }
    crc = crc ^ 0xFFFFFFFF;
    format!("{:08x}", crc)
}

static CRC32_TABLE: [u32; 256] = [
    0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA, 0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
    0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988, 0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
    0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE, 0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
    0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC, 0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
    0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172, 0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
    0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940, 0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
    0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116, 0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
    0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924, 0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
    0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A, 0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
    0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818, 0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
    0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E, 0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
    0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C, 0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
    0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2, 0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
    0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0, 0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7FC9,
    0x5005723C, 0x270242AA, 0xBE0B1310, 0xC90C2386, 0x5768B625, 0x206F86B3, 0xB966D709, 0xCE61E79F,
    0x5EDEF60E, 0x29D9C698, 0xB0D09722, 0xC7D7A7B4, 0x59B33217, 0x2EB40281, 0xB7BD533B, 0xC0BA63AD,
    0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A, 0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
    0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8, 0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
    0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE, 0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
    0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC, 0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
    0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252, 0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
    0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60, 0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
    0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236, 0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
    0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04, 0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
    0x9B6406B0, 0xEC633626, 0x756A679C, 0x026D570A, 0x9C09C2A9, 0xEB0EF23F, 0x7207A385, 0x05009313,
    0x95BF8E82, 0xE2B8BE14, 0x7BB1EFAE, 0x0CB6DF38, 0x92D24A9B, 0xE5D57A0D, 0x7CDD2BB7, 0x0BDA1B21,
    0x86D216D4, 0xF1D52642, 0x68DC77F8, 0x1FDB476E, 0x81BFD2CD, 0xF6B8E25B, 0x6FB1B3E1, 0x18B68377,
    0x88099EE6, 0xFF0EAE70, 0x6607FFCA, 0x1100CF5C, 0x8F645AFF, 0xF8636A69, 0x616A3BD3, 0x166D0B45,
    0xA00B2678, 0xD70C16EE, 0x4E054754, 0x390277C2, 0xA766E261, 0xD061D2F7, 0x4968834D, 0x3E6FB3DB,
    0xAED0AE4A, 0xD9D79EDC, 0x40DECF66, 0x37D9FFF0, 0xA9BD6A53, 0xDEBA5AC5, 0x47B30B7F, 0x30B43BE9,
    0xBDBC361C, 0xCABB068A, 0x53B25730, 0x24B567A6, 0xBAD1F205, 0xCDD6C293, 0x54DF9329, 0x23D8A3BF,
    0xB367BE2E, 0xC4608EB8, 0x5D69DF02, 0x2A6EEF94, 0xB40A7A37, 0xC30D4AA1, 0x5A041B1B, 0x2D032B8D,
];

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
