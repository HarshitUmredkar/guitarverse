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


## AI Song Finder setup (one-time)

The Song Finder UI is included, but it needs a small server-side proxy so your Gemini API key is never exposed in the public website. The proxy source is `cloudflare-worker.js`.

1. Create a free Cloudflare account and open **Workers & Pages**.
2. Create a Worker named `guitarverse-finder`.
3. Replace its starter code with the full contents of `cloudflare-worker.js`, then Deploy.
4. In the Worker settings, add a secret named `GEMINI_API_KEY`. Create the key in Google AI Studio. Never paste the key into `app.js`, `index.html`, GitHub, or the browser.
5. Copy the deployed Worker URL, e.g. `https://guitarverse-finder.<your-subdomain>.workers.dev`.
6. Open your GUITARVERSE site, choose **Find a song → Connection settings**, paste the Worker URL, and Save connection.

The Worker uses Gemini with Google Search grounding. Search grounding/API quotas and pricing depend on Google's current account, model and region terms; check the Google AI Studio / Gemini API billing page before relying on it as a free service. Cloudflare Worker limits also apply.

### Important content and accuracy notes
- Search results are suggestions, not a guarantee that a chord chart is musically correct. The UI shows source links; verify the arrangement, tuning, key and capo against the recording.
- The importer does not scrape arbitrary chord websites or bypass logins/paywalls. It imports chord information returned by the AI search service and source links.
- Full copyrighted lyrics are not automatically reproduced. Lyrics are saved only when the source clearly permits reuse (for example, public-domain or licensed material); otherwise open the source link for the lyric sheet. This avoids promising an import that a website or copyright owner does not allow.
- Voice search uses the browser's speech recognition support and may require internet and microphone permission.
- The Worker URL is saved locally in this browser. No API key is stored in the app.
