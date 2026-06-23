🧠 Rôle & Contexte
Tu es un développeur Senior Fullstack, expert en Rust, Tauri v2, React 18, Tailwind CSS, et en architecture d'applications Desktop cross-platform haute performance. Tu maîtrises les outils CLI médias (yt-dlp, aria2c, FFmpeg) et leur intégration via le pattern Sidecar de Tauri.
Tu vas concevoir et implémenter de A à Z l'application TelVid-Vizane : un téléchargeur universel de vidéos, lecteur multimédia privé et convertisseur audio/vidéo — tout-en-un, futuriste, et performant comme un logiciel natif.

🏗️ Architecture Globale
┌─────────────────────────────────────────┐
│         Frontend (React + Tailwind)      │
│  SearchBar │ FormatPicker │ ProgressZone │
│  Sidebar   │ VideoPlayer  │ Converter    │
└──────────────────┬──────────────────────┘
                   │ Tauri IPC (invoke / emit)
┌──────────────────▼──────────────────────┐
│         Backend Rust (Tauri Core)        │
│  Commands │ Queue Manager │ PremiumCheck │
│  FFmpeg Pipeline │ SQLite (historique)   │
└───────┬─────────────┬──────────┬────────┘
        │             │          │
   yt-dlp          aria2c     FFmpeg
  (sidecar)       (sidecar)  (sidecar)

⚙️ Backend Rust — Spécifications détaillées
Pattern Sidecar Tauri
Intègre yt-dlp, aria2c et FFmpeg comme binaires sidecar dans tauri.conf.json. Ces processus sont pilotés depuis Rust via std::process::Command ou tokio::process::Command (async).
Commandes Tauri (invoke)
get_video_info(url: String) -> Result<VideoInfo, String>

Appelle yt-dlp --dump-json <url>
Parse le JSON et retourne :

rust  struct VideoInfo {
    title: String,
    thumbnail: String,        // URL base64 ou chemin local
    duration_seconds: u64,
    formats: Vec<FormatOption>, // { id, ext, resolution, filesize, fps, codec }
    platform: String,          // "youtube" | "tiktok" | "facebook" | ...
  }

Supporte : YouTube, Facebook, TikTok, Instagram, Twitter/X, Twitch, Dailymotion, Vimeo, et tout site supporté par yt-dlp

start_download(config: DownloadConfig) -> Result<String, String>

Génère un download_id UUID unique
Lance aria2c en mode multi-connexions (16 par défaut en mode Turbo)
Ajoute le téléchargement à la file d'attente intelligente (Arc<Mutex<Queue>>)
Retourne le download_id au frontend
Config :

rust  struct DownloadConfig {
    url: String,
    format_id: String,
    output_path: String,
    priority: u8,           // 1 (haute) à 5 (basse)
    turbo_mode: bool,       // active les 16 connexions aria2c
    auto_convert_mp4: bool, // lance FFmpeg après download
    extract_audio: bool,    // extrait en MP3 320kbps
  }
get_download_progress() -> (géré par Events Tauri)

Thread Rust dédié qui écoute la sortie stdout d'aria2c
Émet l'event download-progress vers React :

rust  struct ProgressPayload {
    download_id: String,
    percent: f32,
    speed_mbps: f32,
    eta_seconds: u32,
    status: String,   // "downloading" | "converting" | "done" | "error"
  }
convert_to_mp4(input_path: String) -> Result<String, String>

Invoque FFmpeg : ffmpeg -i input.webm -c:v libx264 -c:a aac -movflags +faststart output.mp4
Tous les fichiers téléchargés via yt-dlp (.webm, .mkv) sont automatiquement convertis en .mp4 après téléchargement
Retourne le chemin du fichier .mp4 final

extract_audio(input_path: String, quality: u32) -> Result<String, String>

Extraction audio locale : ffmpeg -i input.mp4 -vn -b:a 320k output.mp3
quality : 128 | 192 | 320 (kbps)
Accessible aussi via l'outil Convertisseur intégré (vidéo locale → audio)

get_library() -> Vec<DownloadedVideo>

Lit la base SQLite locale
Retourne l'historique complet :

rust  struct DownloadedVideo {
    id: String,
    title: String,
    thumbnail_path: String,
    file_path: String,
    duration_seconds: u64,
    file_size_mb: f32,
    downloaded_at: String,
    platform: String,
    format: String,   // "mp4" | "mp3"
  }
open_file(path: String)

Ouvre un fichier avec l'application système par défaut via l'API shell de Tauri

check_premium_status() -> PremiumStatus (logique côté Rust, non contournable)

Vérifie un fichier de licence signé localement
Retourne les droits : { max_resolution: "480p" | "unlimited", turbo_mode: bool, concurrent_downloads: u8 }
Les limitations sont appliquées dans start_download — jamais côté frontend seul

preview_stream(url: String, seconds: u8) -> Result<String, String>

Utilise yt-dlp pour streamer progressivement les N premières secondes
Retourne une URL de stream locale pour le mini-player

Stockage SQLite

Librairie : rusqlite ou sqlx avec tokio
Tables : downloads, library, queue, settings
Migrations automatiques au démarrage


🎨 Frontend React — Spécifications détaillées
Design System — Thème Futuriste
js// tailwind.config.js — palette custom
colors: {
  void: '#020817',      // fond principal (slate-950)
  panel: '#0f172a',     // panneaux (slate-900)
  glass: 'rgba(15,23,42,0.6)', // glassmorphism
  neon: {
    blue: '#3b82f6',    // accent principal
    violet: '#8b5cf6',  // accent secondaire
    cyan: '#06b6d4',    // highlights
  }
}
Règles visuelles :

Fond void (#020817), surfaces panel avec backdrop-filter: blur(12px)
Bordures : border border-white/5 à border-white/10
Accents néon via box-shadow: 0 0 20px rgba(59,130,246,0.3)
Animations : Framer Motion pour toutes les transitions (spring physics)
Typographie : Inter ou Geist — poids 300/400/600/700
Icônes : lucide-react

Composants
<SearchBar />

Champ central avec icône de recherche néon
Drag & Drop natif : onDrop sur le composant entier → extrait l'URL du dataTransfer
Bouton "Analyser" → spinner pendant get_video_info
Indicateur de plateforme détectée (icône YouTube/TikTok/etc.)
Animation d'entrée : slide-up + fade

<VideoInfoCard />

Apparaît après analyse (animation Framer Motion : scale 0.9 → 1)
Miniature avec overlay gradient
Titre, durée, plateforme
Cartes de format sélectionnables :

Carte "HD 1080p" (🔒 Premium si plan gratuit)
Carte "SD 480p"
Carte "Audio MP3 320kbps"
Badge "Turbo" activable (16 connexions)



<DownloadQueue />

Liste des téléchargements actifs
Barre de progression animée avec dégradé néon
Affiche : vitesse, %, ETA, nom du fichier
Bouton pause/annuler par download
Animation d'entrée/sortie par item (AnimatePresence de Framer)

<Sidebar /> (rétractable droite)

Toggle bouton avec animation smooth
Onglet Bibliothèque :

Grille de miniatures des vidéos téléchargées
Chaque carte : thumbnail, titre tronqué, durée, taille
Bouton ▶ Lire → ouvre le lecteur intégré
Bouton 📁 → ouvre dans l'explorateur via Tauri shell
Bouton 🗑 → supprime (fichier + BDD)


Onglet Convertisseur :

Drag & Drop de fichier local
Choix : Video → MP4 / Video → MP3 (128/192/320kbps)
Barre de progression FFmpeg



<VideoPlayer /> (lecteur intégré dans la Sidebar)

Lecteur HTML5 natif (<video>) stylisé custom
Supporte : MP4, MKV, WebM, MOV, AVI (tout ce que le codec système supporte)
Affiche : miniature thumbnail, titre, durée totale
Contrôles : play/pause, seek bar néon, volume, plein écran, vitesse (0.5x → 2x)
Mode prévisualisation : lit les N premières secondes du stream avant fin du download
Pour les formats non supportés nativement → fallback vers open_file() (VLC etc.)

<NotificationToast />

Notification système Tauri quand un download est terminé
Toast in-app en bas à droite avec animation

<LanguageSwitcher />

Bascule FR / EN via i18next + react-i18next
Fichiers de traduction : locales/fr.json, locales/en.json


🚀 Fonctionnalités Avancées
Mode Turbo (Multi-Source aria2c)
basharia2c --max-connection-per-server=16 --split=16 --min-split-size=1M \
       --file-allocation=none --continue=true -o output.mp4 <url>

Activable par toggle dans l'UI
Réservé au plan Premium (check côté Rust)
Gain de vitesse : 3×–8× selon le serveur source

File d'attente intelligente

Rust : Arc<Mutex<VecDeque<DownloadJob>>>
Priorité configurable (1 à 5) par l'utilisateur
Max concurrent : 3 downloads simultanés (configurable en settings)
Reprise automatique en cas d'interruption

Drag & Drop d'URL

Écoute le dragover + drop sur l'ensemble de la fenêtre
Extrait l'URL depuis event.dataTransfer.getData('text/uri-list') ou text/plain
Lance automatiquement get_video_info dès le drop
Animation visuelle pendant le survol (bordure néon pulsante)

Conversion automatique WebM → MP4

Après chaque download yt-dlp, FFmpeg est automatiquement invoqué
Pipeline : yt-dlp download → FFmpeg convert → SQLite insert → Event "done"
L'utilisateur ne voit que le fichier .mp4 final dans sa bibliothèque

Convertisseur local Video → Audio

Accessible sans connexion internet
Supporte tout fichier local glissé dans l'app
Qualité sélectionnable : MP3 128 / 192 / 320 kbps, ou AAC, FLAC
Progress bar FFmpeg via parsing de la sortie stderr

Prévisualisation progressive (Streaming)

yt-dlp avec --download-sections "*0:00-0:10" pour les 10 premières secondes
Fichier temporaire streamé vers <video src="..."> dans la sidebar
Disponible avant la fin du téléchargement complet

Auto-Update Tauri
json// tauri.conf.json
"updater": {
  "active": true,
  "endpoints": ["https://your-update-server.com/{{target}}/{{current_version}}"],
  "dialog": true,
  "pubkey": "..."
}

Update automatique du binaire et des sidecars (yt-dlp se met à jour souvent)
Notification à l'utilisateur avec changelog


🗂️ Structure du Projet
telvid-vizane/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Setup Tauri, commands registration
│   │   ├── commands/
│   │   │   ├── downloader.rs    # get_video_info, start_download
│   │   │   ├── converter.rs     # convert_to_mp4, extract_audio
│   │   │   ├── library.rs       # get_library, delete_video
│   │   │   └── premium.rs       # check_premium_status
│   │   ├── queue.rs             # File d'attente async
│   │   ├── db.rs                # SQLite via rusqlite
│   │   └── events.rs            # Émission d'events vers React
│   ├── binaries/                # Sidecars: yt-dlp, aria2c, ffmpeg (par OS)
│   └── tauri.conf.json
├── src/
│   ├── components/
│   │   ├── SearchBar.tsx
│   │   ├── VideoInfoCard.tsx
│   │   ├── FormatPicker.tsx
│   │   ├── DownloadQueue.tsx
│   │   ├── Sidebar.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── Converter.tsx
│   │   └── NotificationToast.tsx
│   ├── hooks/
│   │   ├── useDownload.ts       # logique download + events Tauri
│   │   ├── useLibrary.ts        # CRUD bibliothèque
│   │   └── usePremium.ts        # gestion plan
│   ├── stores/
│   │   └── downloadStore.ts     # Zustand pour l'état global
│   ├── locales/
│   │   ├── fr.json
│   │   └── en.json
│   ├── lib/
│   │   └── tauri.ts             # wrappers typed pour invoke/listen
│   └── App.tsx

💡 Recommandations additionnelles (avis du développeur)
Gestion d'état : Utilise Zustand (léger, sans boilerplate) pour stocker la queue, la bibliothèque et les settings. Évite Redux pour une app de cette taille.

Sécurité du Premium Check : Implémente une vérification par signature HMAC du fichier licence côté Rust. Ne jamais passer par le frontend pour valider un droit — toujours depuis une commande Rust.

Performance du lecteur : Pour les très gros fichiers locaux, utilise tauri://localhost avec un handler de fichiers statiques plutôt qu'une URL file:// directe — meilleure compatibilité cross-platform.

Compatibilité formats : Le tag <video> HTML5 est limité (H.264/AAC/WebM). Pour les formats exotiques (AVI, MKV avec codec rare), détecte l'impossibilité de lecture et propose automatiquement open_file() avec VLC/IINA.

Thumbnails offline : À la fin de chaque download, copie la miniature en local (via yt-dlp --write-thumbnail) et stocke le chemin en SQLite. La bibliothèque fonctionne ainsi 100% hors ligne.

Settings persistants : Utilise tauri-plugin-store pour persister les préférences utilisateur (dossier de téléchargement, langue, mode turbo, thème).

Build cross-platform : Configure GitHub Actions avec des runners Windows, macOS et Linux pour générer les .exe, .dmg et .AppImage automatiquement. Les sidecars doivent être compilés/packagés pour chaque cible.