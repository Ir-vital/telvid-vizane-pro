# Configuration des binaires sidecar

## Méthode automatique (Recommandée)

Exécute le script PowerShell :

```powershell
.\download-binaries.ps1
```

Ce script télécharge automatiquement yt-dlp et FFmpeg et les place dans `src-tauri/binaries/` avec le bon nom.

---

## Méthode manuelle

### 1. Télécharger les binaires

**yt-dlp :**
- URL : https://github.com/yt-dlp/yt-dlp/releases/latest
- Fichier : `yt-dlp.exe`

**FFmpeg :**
- URL : https://github.com/BtbN/FFmpeg-Builds/releases
- Fichier : `ffmpeg-master-latest-win64-gpl.zip`
- Extrait et récupère `bin/ffmpeg.exe`

### 2. Renommer selon la convention Tauri

Les binaires doivent être nommés : `{nom}-{target}.exe`

Pour Windows 64-bit, le target est : `x86_64-pc-windows-msvc`

Renomme :
- `yt-dlp.exe` → `yt-dlp-x86_64-pc-windows-msvc.exe`
- `ffmpeg.exe` → `ffmpeg-x86_64-pc-windows-msvc.exe`

### 3. Placer dans le dossier

Place les fichiers renommés dans :
```
src-tauri/binaries/
├── yt-dlp-x86_64-pc-windows-msvc.exe
└── ffmpeg-x86_64-pc-windows-msvc.exe
```

---

## Activer les sidecars dans tauri.conf.json

Une fois les binaires en place, réactive-les dans `src-tauri/tauri.conf.json` :

```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": [...],
  "externalBin": [
    "binaries/yt-dlp",
    "binaries/ffmpeg"
  ]
}
```

---

## Vérification

Après avoir placé les binaires et modifié `tauri.conf.json`, lance :

```bash
npm run tauri dev
```

L'app devrait compiler sans erreur et les fonctionnalités de téléchargement/conversion seront opérationnelles.

---

## Autres plateformes

### macOS (Intel)
Target : `x86_64-apple-darwin`
- Télécharge les versions macOS de yt-dlp et FFmpeg
- Renomme : `yt-dlp-x86_64-apple-darwin`, `ffmpeg-x86_64-apple-darwin`
- Rends-les exécutables : `chmod +x binaries/*-x86_64-apple-darwin`

### macOS (Apple Silicon)
Target : `aarch64-apple-darwin`
- Même processus avec le target ARM64

### Linux
Target : `x86_64-unknown-linux-gnu`
- Télécharge les versions Linux statiques
- Renomme : `yt-dlp-x86_64-unknown-linux-gnu`, `ffmpeg-x86_64-unknown-linux-gnu`
- Rends-les exécutables : `chmod +x binaries/*-x86_64-unknown-linux-gnu`

---

## Alternative : Installation système

Si tu ne veux pas packager les binaires, installe-les sur ton système :

**Windows :**
```powershell
winget install yt-dlp
winget install FFmpeg
```

**macOS :**
```bash
brew install yt-dlp ffmpeg
```

**Linux :**
```bash
sudo apt install yt-dlp ffmpeg  # Debian/Ubuntu
sudo pacman -S yt-dlp ffmpeg    # Arch
```

Dans ce cas, laisse `externalBin` vide dans `tauri.conf.json`. Le code Rust utilisera les binaires du PATH système.
