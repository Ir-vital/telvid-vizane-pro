# Guide de démarrage rapide

## En 3 commandes

```powershell
# 1. Installer les dépendances
npm install

# 2. Télécharger et configurer les binaires
.\setup.ps1

# 3. Lancer l'app
npm run tauri dev
```

C'est tout ! 🚀

---

## Que fait `setup.ps1` ?

1. Télécharge **yt-dlp** depuis GitHub
2. Télécharge **FFmpeg** depuis GitHub
3. Les renomme selon la convention Tauri (`{nom}-x86_64-pc-windows-msvc.exe`)
4. Les place dans `src-tauri/binaries/`
5. Active les sidecars dans `tauri.conf.json`

---

## Problèmes courants

### "setup.ps1 cannot be loaded because running scripts is disabled"

Exécute d'abord :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Binaires manquants" après setup.ps1

Vérifie que les fichiers existent :
```powershell
dir src-tauri\binaries
```

Tu devrais voir :
- `yt-dlp-x86_64-pc-windows-msvc.exe`
- `ffmpeg-x86_64-pc-windows-msvc.exe`

### Compilation Rust lente

La première compilation prend 2-5 minutes (téléchargement des dépendances). Les suivantes sont rapides.

---

## Alternative : Installation système

Si tu préfères ne pas packager les binaires :

```powershell
# Installer via winget
winget install yt-dlp
winget install FFmpeg

# Puis lance directement
npm run tauri dev
```

Dans ce cas, **ne lance pas** `setup.ps1`. Le code Rust utilisera les binaires du PATH système.

---

## Prochaines étapes

Une fois l'app lancée :

1. Colle une URL YouTube dans la barre de recherche
2. Clique sur "Analyser"
3. Choisis un format (480p, 1080p, MP3)
4. Clique sur "Télécharger"
5. Ouvre la sidebar (bouton à droite) pour voir ta bibliothèque

---

## Documentation complète

- [BINARIES_SETUP.md](BINARIES_SETUP.md) — Guide détaillé des binaires
- [PROMPT.md](PROMPT.md) — Cahier des charges complet
- [README.md](README.md) — Documentation principale
