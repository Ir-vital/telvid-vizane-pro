# Plan final - TelVid-Vizane

## État actuel

✅ **Code complet** : Backend Rust + Frontend React
✅ **Compile** : L'app se lance
❌ **Interface blanche** : Tailwind ne charge pas correctement
❌ **Binaires manquants** : yt-dlp et FFmpeg non installés

---

## Plan de correction (dans l'ordre)

### 1. Corriger l'affichage (Tailwind)

**Fichiers modifiés :**
- ✅ `src/App.css` — Retiré les `@layer` (incompatibles Tailwind v4)
- ✅ `vite.config.ts` — Ajouté `import tailwindcss from "@tailwindcss/vite"`

**Test :**
```bash
npm run tauri dev
```

**Résultat attendu :** Interface noire avec texte blanc visible.

---

### 2. Installer les binaires (méthode simple)

**Ne PAS utiliser les scripts PowerShell** (ils ont des bugs d'encodage).

**Méthode recommandée :**

```powershell
winget install yt-dlp
winget install FFmpeg
```

**Vérification :**
```powershell
yt-dlp --version
ffmpeg -version
```

**Résultat attendu :** Les commandes affichent les versions.

---

### 3. Tester l'application

1. Lance : `npm run tauri dev`
2. Colle une URL YouTube
3. Clique "Analyser"
4. Télécharge une vidéo

**Résultat attendu :** La vidéo se télécharge et apparaît dans la bibliothèque (sidebar).

---

## Pourquoi cette approche ?

### ❌ Ce qui ne marche PAS :
- Scripts PowerShell avec caractères spéciaux (✓, emojis)
- Activer/désactiver les sidecars dans tauri.conf.json
- Télécharger et renommer manuellement les binaires

### ✅ Ce qui marche :
- Installation système via `winget` (binaires dans le PATH)
- Le code Rust cherche automatiquement dans le PATH
- Pas besoin de modifier `tauri.conf.json`

---

## Fichiers importants

### Configuration
- `vite.config.ts` — Plugin Tailwind ajouté
- `src/App.css` — Styles sans @layer
- `tailwind.config.js` — Palette custom (void, neon, etc.)

### Code Rust
- `src-tauri/src/commands/downloader.rs` — Utilise yt-dlp
- `src-tauri/src/commands/converter.rs` — Utilise FFmpeg
- Fonction `get_sidecar_path()` — Cherche dans PATH si sidecar absent

### Frontend
- `src/App.tsx` — Layout principal
- `src/components/` — 9 composants UI
- `src/stores/downloadStore.ts` — State Zustand

---

## Prochaines étapes

1. **Teste l'interface** : `npm run tauri dev`
   - Si blanche → Vérifie vite.config.ts
   - Si noire avec texte → ✅ OK

2. **Installe les binaires** : `winget install yt-dlp` + `winget install FFmpeg`

3. **Teste un téléchargement** : URL YouTube → Analyser → Télécharger

4. **Si ça marche** : L'app est fonctionnelle !

---

## Notes

- Les warnings Rust (`dead_code`) sont normaux, ce sont des fonctions utilitaires
- L'app compile même sans binaires (les téléchargements échoueront gracieusement)
- La base SQLite se crée automatiquement au premier lancement
- Les fichiers téléchargés vont dans le dossier courant (`.`) par défaut

---

## Résumé en 3 commandes

```powershell
# 1. Installer les outils
winget install yt-dlp
winget install FFmpeg

# 2. Lancer l'app
npm run tauri dev

# 3. Tester avec YouTube
# (dans l'app : coller URL → Analyser → Télécharger)
```

**C'est tout.** Pas de scripts, pas de complications.
