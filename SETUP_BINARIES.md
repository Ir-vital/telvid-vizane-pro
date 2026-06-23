# Configuration des binaires (yt-dlp, FFmpeg)

Pour que l'application fonctionne pleinement, tu dois installer les outils CLI nécessaires.

## Option 1 : Installation système (Recommandé pour le développement)

### Windows

**yt-dlp :**
```bash
# Via winget
winget install yt-dlp

# Ou télécharge depuis https://github.com/yt-dlp/yt-dlp/releases
# Place yt-dlp.exe dans C:\Windows\System32 ou ajoute au PATH
```

**FFmpeg :**
```bash
# Via winget
winget install FFmpeg

# Ou télécharge depuis https://ffmpeg.org/download.html
# Extrait et ajoute le dossier bin\ au PATH système
```

**Vérification :**
```bash
yt-dlp --version
ffmpeg -version
```

## Option 2 : Sidecars Tauri (Pour la distribution)

Pour packager l'app avec les binaires intégrés :

1. Télécharge les binaires :
   - **yt-dlp** : https://github.com/yt-dlp/yt-dlp/releases
   - **FFmpeg** : https://ffmpeg.org/download.html (builds statiques)

2. Renomme selon la convention Tauri :
   ```
   src-tauri/binaries/
   ├── yt-dlp-x86_64-pc-windows-msvc.exe
   ├── ffmpeg-x86_64-pc-windows-msvc.exe
   ├── yt-dlp-x86_64-apple-darwin        (macOS Intel)
   ├── ffmpeg-x86_64-apple-darwin
   ├── yt-dlp-aarch64-apple-darwin       (macOS ARM)
   ├── ffmpeg-aarch64-apple-darwin
   ├── yt-dlp-x86_64-unknown-linux-gnu   (Linux)
   └── ffmpeg-x86_64-unknown-linux-gnu
   ```

3. Décommente dans `src-tauri/tauri.conf.json` :
   ```json
   "externalBin": [
     "binaries/yt-dlp",
     "binaries/ffmpeg"
   ]
   ```

## État actuel

L'app compile et tourne **sans les binaires** (les commandes échoueront gracieusement). Pour tester les téléchargements, installe au moins **yt-dlp** et **FFmpeg** via l'Option 1.

## Note sur aria2c

aria2c était prévu pour le mode Turbo (multi-connexions), mais yt-dlp gère déjà le téléchargement efficacement. Tu peux l'ignorer pour l'instant.
