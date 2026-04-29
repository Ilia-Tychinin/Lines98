# Lines 98

A classic Lines 98 (Color Lines) puzzle game built as a PWA for iPhone. Runs fully offline after installation — no backend, no subscription, no app store.

## Prerequisites

- Windows PC with [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- iPhone on the same Wi-Fi network
- Safari on iPhone (required for PWA install)

## First-time setup

Run from the project root in PowerShell:

```powershell
.\setup.ps1
```

This will:
1. Detect your local IP address and PC hostname (printed at startup)
2. Generate a self-signed SSL certificate covering both the IP and `<hostname>.local` (saved to `ssl/`, created once)
3. Build the Docker image
4. Start the container on ports 80 and 443

On subsequent runs the certificate is reused — only the image is rebuilt.

> To force a new certificate (e.g. after changing Wi-Fi networks or moving to a new machine): delete the `ssl/` folder and re-run `setup.ps1`. Reinstall the new certificate on iPhone.

## Install on iPhone

### Step 1 — Trust the certificate

Open **Safari** on your iPhone and navigate to:

```
http://<hostname>.local/cert.pem
```

`<hostname>` is your PC name — printed by `setup.ps1` at startup. Safari will say "Profile Downloaded". Then:

1. **Settings → General → VPN & Device Management** → tap the **Lines98 Local HTTPS** profile → **Install**
2. **Settings → General → About → Certificate Trust Settings** → toggle **Lines98 Local HTTPS** on

Both steps are required. Without step 2 the game loads as a white page.

> You only need to do this once. The certificate is valid for 10 years.

### Step 2 — Open the game

In Safari navigate to:

```
https://<hostname>.local
```

Use this URL going forward — it stays stable even if your PC's IP changes.

### Step 3 — Install as PWA

Tap the **Share** button → **Add to Home Screen** → **Add**.

The game icon appears on your home screen. The service worker caches all assets — Docker can be stopped and the game plays offline from the device cache.

## Daily use

```powershell
# Start or redeploy
.\setup.ps1

# Stop
docker stop lines98
```

`setup.ps1` always does a full rebuild — use it both to start the server and to deploy code changes. After it completes, open the home screen app on iPhone: it detects the update automatically and shows a banner. Tap it to reload with the new version.

## Removing the certificate

If you no longer need the game:

1. **Settings → General → About → Certificate Trust Settings** → toggle **Lines98 Local HTTPS** off
2. **Settings → General → VPN & Device Management** → tap **Lines98 Local HTTPS** → **Remove**

## Project structure

```
Lines 98/
├── src/                  # Game files served by nginx
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   ├── manifest.json
│   ├── service-worker.js
│   └── icons/
├── tools/
│   └── generate-icons.html   # Resize lines-98-icon.png → icons/
├── assets/
│   ├── lines-98-icon.png     # Source icon
│   └── image.png             # Reference screenshot
├── docs/
│   ├── development-plan.md
│   └── lines98-project-brief.md
├── ssl/                  # Generated — not committed
│   ├── cert.pem
│   └── key.pem
├── nginx.conf
├── Dockerfile
└── setup.ps1
```

## How it works

- **Rendering**: CSS Grid + DOM elements
- **Pathfinding**: Breadth-first search on the 9×9 grid
- **Offline**: Service worker with cache-first strategy
- **HTTPS**: Required by iOS Safari for service worker registration; self-signed cert trusted manually once
