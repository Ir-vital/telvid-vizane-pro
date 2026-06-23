# Test simple - Étapes de vérification

## 1. Vérifier que Vite compile

```bash
npm run dev
```

Ouvre http://localhost:1420 dans ton navigateur. Tu devrais voir l'interface avec le fond noir (#020817).

Si ça marche, passe à l'étape 2.

## 2. Vérifier que Tauri compile (sans binaires)

```bash
npm run tauri dev
```

L'app devrait s'ouvrir avec l'interface visible (fond noir, texte blanc).

## 3. Tester l'interface

Dans l'app :
- Tu devrais voir "TelVid-Vizane" en haut
- Une barre de recherche au centre
- Un texte "Téléchargez n'importe quelle vidéo"

## 4. Ajouter les binaires (optionnel pour tester l'UI)

Pour tester les téléchargements, installe yt-dlp et FFmpeg :

```powershell
winget install yt-dlp
winget install FFmpeg
```

Puis relance l'app. Les téléchargements fonctionneront.

## Problèmes courants

### Interface blanche
- Vérifie que `@tailwindcss/vite` est dans package.json
- Vérifie que `vite.config.ts` importe `tailwindcss`
- Redémarre le serveur Vite

### Erreur "binaries not found"
- Normal si tu n'as pas lancé setup.ps1
- L'app compile quand même, seuls les téléchargements ne marcheront pas
