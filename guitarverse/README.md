# GUITARVERSE — Personal Guitar Book

A mobile-first, offline-first personal guitar songbook. No account, backend, ads, analytics, or external song catalogue.

## Features
- Add, edit, delete, search, and filter your own songs.
- Manually mark songs as played and record the played date.
- Store artist, lyrics/chord sheet, chord progression, original key, capo, BPM, strumming, difficulty, favourites, and personal notes.
- Song detail / performance-friendly reading view.
- Metronome, chord reference, chord transposer, and basic microphone tuner.
- Export and restore a JSON backup.
- PWA manifest and service worker for installation and offline app shell.

## Publish with GitHub Pages (free)
1. Sign in to GitHub and create a new **public** repository named `guitarverse`.
2. Upload the contents of this folder to the repository root. Make sure `index.html` is at the root, not inside another nested folder.
3. Open the repository **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**, then Save.
6. Wait for GitHub Pages to publish. The URL will look like `https://YOUR-USERNAME.github.io/guitarverse/`.
7. Open that URL in Chrome on your Android phone. Wait for the first load to finish while online.
8. In Chrome, open the menu (⋮) and choose **Install app** or **Add to Home screen**.

## Important storage and backup notes
- Song data is stored in IndexedDB in the browser on this device.
- It does not sync automatically to another browser or phone.
- Clearing Chrome/site data can erase your songbook. Use **Export backup** regularly and keep the JSON file somewhere safe.
- To move your songs to another device, open GUITARVERSE there and use **Restore** with your backup JSON.
- Offline mode is available after the first successful online visit and service-worker caching.
- The basic tuner needs microphone permission and HTTPS. Its readings can vary with phone microphones, background noise, and harmonics.

## Privacy
No login, cloud database, ads, analytics, or song API. The Google Fonts import in the stylesheet is decorative; if offline or blocked, the browser falls back to system fonts. All song data remains local to the browser.

## Copyright
The app does not ship with copyrighted songs or lyrics. Add only lyrics and arrangements you have permission to store.
