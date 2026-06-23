# TelVid-Vizane

Téléchargeur universel de vidéos, lecteur multimédia et convertisseur audio/vidéo.

**Plateformes supportées :** YouTube · TikTok · Instagram · Facebook · Twitter · Twitch · Vimeo · Dailymotion

---

## Installation (3 étapes)

### 1. Installer les dépendances

```bash
npm install
```

### 2. Installer yt-dlp et FFmpeg

```powershell
winget install yt-dlp
winget install FFmpeg
```

Vérifie l'installation :
```powershell
yt-dlp --version
ffmpeg -version
```

### 3. Lancer l'application

```bash
npm run tauri dev
```

**C'est tout !** L'app s'ouvre avec l'interface complète.

---

## Utilisation

1. Colle une URL YouTube dans la barre de recherche
2. Clique sur "Analyser"
3. Choisis un format (HD 1080p, SD 480p, ou MP3)
4. Clique sur "Télécharger"
5. Ouvre la sidebar (bouton à droite) pour voir ta bibliothèque

---

## Fonctionnalités

- ✅ Téléchargement vidéos (10+ plateformes)
- ✅ Formats multiples (1080p, 480p, MP3)
- ✅ Conversion vidéo → MP4
- ✅ Extraction audio → MP3
- ✅ Lecteur vidéo intégré
- ✅ Bibliothèque locale SQLite
- ✅ File d'attente intelligente
- ✅ Interface futuriste (Tailwind + Framer Motion)
- ✅ Multilingue (FR/EN)

---

## Problèmes courants

### Interface blanche

Vérifie que `vite.config.ts` contient :
```ts
import tailwindcss from "@tailwindcss/vite";
plugins: [react(), tailwindcss()],
```

Redémarre : `npm run tauri dev`

### "yt-dlp not found"

Réinstalle :
```powershell
winget install yt-dlp
winget install FFmpeg
```

Redémarre ton terminal.

---

## Architecture

- **Frontend :** React 19 + TypeScript + Tailwind CSS + Framer Motion
- **Backend :** Rust + Tauri v2
- **Base de données :** SQLite (rusqlite)
- **Outils CLI :** yt-dlp, FFmpeg (PATH système)

---

## Documentation

- [PLAN_FINAL.md](PLAN_FINAL.md) — Plan de correction et état actuel
- [DEMARRAGE_SIMPLE.md](DEMARRAGE_SIMPLE.md) — Guide de démarrage détaillé
- [PROMPT.md](PROMPT.md) — Cahier des charges complet
