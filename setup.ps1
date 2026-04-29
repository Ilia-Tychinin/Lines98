# Lines 98 — One-time setup script
# Run from the project root: .\setup.ps1

$ErrorActionPreference = "Stop"

# ── 1. Detect local IP and hostname ─────────────────────────────
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.PrefixOrigin -in @('Dhcp','Manual') -and
                      $_.IPAddress    -notlike '169.*'        -and
                      $_.InterfaceAlias -notlike 'vEthernet*' -and
                      $_.InterfaceAlias -notlike '*Virtual*'  -and
                      $_.InterfaceAlias -notlike '*Loopback*' } |
       Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Error "Could not detect local IP. Check your Wi-Fi connection."
    exit 1
}

$hostname = $env:COMPUTERNAME

Write-Host "Local IP: $ip" -ForegroundColor Cyan
Write-Host "Hostname: $hostname.local" -ForegroundColor Cyan

# ── 2. Check Docker is running ──────────────────────────────────
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Docker is not running. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# ── 3. Generate SSL certificate (only if not yet created) ───────
New-Item -ItemType Directory -Path "ssl" -Force | Out-Null

if ((Test-Path "ssl/cert.pem") -and (Test-Path "ssl/key.pem")) {
    Write-Host "Certificate already exists — skipping generation." -ForegroundColor DarkGray
    Write-Host "(Delete the ssl/ folder and re-run to regenerate.)" -ForegroundColor DarkGray
} else {
    Write-Host "Generating SSL certificate..." -ForegroundColor Cyan

    docker run --rm `
        -v "${PWD}/ssl:/ssl" `
        nginx:alpine sh -c "
            apk add --no-cache openssl -q 2>/dev/null
            openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
                -keyout /ssl/key.pem \
                -out  /ssl/cert.pem \
                -subj '/CN=Lines98 Local HTTPS ($hostname.local)' \
                -addext 'subjectAltName=IP:$ip,DNS:$hostname.local' 2>/dev/null
            echo done
        "

    Write-Host "Certificate ready. Install it on iPhone — see README.md." -ForegroundColor Green
}

# ── 4. Stamp cache version in service worker ────────────────────
$cacheVersion = Get-Date -Format 'yyyy.MM.dd-HH:mm:ss'
$swPath = "src/service-worker.js"
(Get-Content $swPath) -replace "const CACHE = 'lines98-[^']*'", "const CACHE = 'lines98-$cacheVersion'" |
    Set-Content $swPath
Write-Host "Cache version: lines98-$cacheVersion" -ForegroundColor DarkGray

# ── 5. Remove old container and image ───────────────────────────
docker stop lines98 2>$null | Out-Null
docker rm   lines98 2>$null | Out-Null
docker rmi  lines98 2>$null | Out-Null

# ── 6. Build and start new container ────────────────────────────
Write-Host "Building image..." -ForegroundColor Cyan
docker build -t lines98 .
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Docker build failed." -ForegroundColor Red
    exit 1
}

docker run -d -p 80:80 -p 443:443 --name lines98 lines98
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to start container." -ForegroundColor Red
    exit 1
}

# ── 7. Instructions ──────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Lines 98 is running!"                                 -ForegroundColor Green
Write-Host "  Build: lines98-$cacheVersion"                         -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  STEP 1 — Trust the certificate on iPhone"            -ForegroundColor Yellow
Write-Host "  Open in Safari:  http://$ip/cert.pem"
Write-Host "  Tap Allow → Settings → General →"
Write-Host "    VPN & Device Management → Install"
Write-Host "  Then: Settings → General → About →"
Write-Host "    Certificate Trust Settings → enable Lines98"
Write-Host ""
Write-Host "  STEP 2 — Open the game"                              -ForegroundColor Yellow
Write-Host "  Stable URL:      https://$hostname.local  (survives IP changes)"
Write-Host "  Fallback URL:    https://$ip"
Write-Host ""
Write-Host "  STEP 3 — Install as PWA"                             -ForegroundColor Yellow
Write-Host "  Share → Add to Home Screen"
Write-Host ""
Write-Host "  After that, stop Docker — game works offline."       -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
