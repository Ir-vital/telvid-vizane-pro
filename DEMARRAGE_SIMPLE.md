# Guide de démarrage simple

## Étape 1 : Lancer l'application (SANS binaires)

L'app peut tourner sans yt-dlp/FFmpeg. Seule l'interface sera visible.

```bash
npm run tauri dev
```

**Résultat attendu :**
- Fenêtre noire avec "TelVid-Vizane" en haut
- Barre de recherche au centre
- Texte "Téléchargez n'importe quelle vidéo"

Si tu vois une **interface blanche**, c'est que Tailwind ne charge pas. Vérifie que tu as bien modifié `vite.config.ts` et `src/App.css`.

---

## Étape 2 : Installer les binaires (pour les téléchargements)

### Option A : Installation système (Simple)

```powershell
winget install yt-dlp
winget install FFmpeg
```

Vérifie :
```powershell
yt-dlp --version
ffmpeg -version
```

Relance l'app. Les téléchargements fonctionneront.

### Option B : Sidecars Tauri (Avancé)

Si tu veux packager les binaires dans l'app :

1. Télécharge manuellement :
   - yt-dlp : https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
   - FFmpeg : https://github.com/BtbN/FFmpeg-Builds/releases (prends le zip win64-gpl)

2. Renomme :
   - `yt-dlp.exe` → `yt-dlp-x86_64-pc-windows-msvc.exe`
   - `ffmpeg.exe` → `ffmpeg-x86_64-pc-windows-msvc.exe`

3. Place dans `src-tauri/binaries/`

4. Modifie `src-tauri/tauri.conf.json`, ajoute dans `bundle` :
   ```json
   "externalBin": [
     "binaries/yt-dlp",
     "binaries/ffmpeg"
   ]
   ```

5. Relance `npm run tauri dev`

---

## Tester l'application

1. Lance l'app : `npm run tauri dev`
2. Colle une URL YouTube dans la barre
3. Clique "Analyser"
4. Choisis un format
5. Clique "Télécharger"
6. Ouvre la sidebar (bouton à droite) pour voir la bibliothèque

---

## Problèmes fréquents

### "Interface blanche"
**Cause :** Tailwind ne charge pas

**Solution :**
1. Vérifie que `vite.config.ts` contient :
   ```ts
   import tailwindcss from "@tailwindcss/vite";
   plugins: [react(), tailwindcss()],
   ```

2. Redémarre complètement :
   ```bash
   # Arrête tout (Ctrl+C)
   npm run tauri dev
   ```

### "resource path binaries\... doesn't exist"
**Cause :** Les binaires ne sont pas installés

**Solution :** Utilise l'Option A (installation système) ci-dessus. C'est plus simple.

### "yt-dlp error" ou "FFmpeg not found"
**Cause :** Les binaires ne sont pas dans le PATH

**Solution :**
```powershell
# Vérifie
where.exe yt-dlp
where.exe ffmpeg

# Si vide, réinstalle
winget install yt-dlp
winget install FFmpeg
```

Redémarre ton terminal après installation.

---

## Résumé : Démarrage rapide

```powershell
# 1. Installer les outils (une seule fois)
winget install yt-dlp
winget install FFmpeg

# 2. Lancer l'app
npm run tauri dev

# 3. Tester avec une URL YouTube
```

C'est tout ! Pas besoin de scripts compliqués.
