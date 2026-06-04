# 叙境 Android Release 构建脚本
# 用法: .\scripts\build-release.ps1

param(
  [string]$VersionName = "1.0.0",
  [string]$VersionCode = "1"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== 叙境 Android Release Build ===" -ForegroundColor Cyan
Write-Host "Version: $VersionName (code $VersionCode)" -ForegroundColor Gray

# ─── 1. Check prerequisites ───
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: java not found. Install JDK 17+ from https://adoptium.net/" -ForegroundColor Red
    exit 1
}

# ─── 2. Set version ───
Write-Host "[1/5] Setting version..." -ForegroundColor Yellow
$buildGradle = "android\app\build.gradle"
(Get-Content $buildGradle) `
  -replace 'versionCode \d+', "versionCode $VersionCode" `
  -replace 'versionName "[^"]*"', "versionName `"$VersionName`"" |
  Set-Content $buildGradle

# ─── 3. Check keystore ───
Write-Host "[2/5] Checking keystore..." -ForegroundColor Yellow
$keystoreProps = "android\keystore.properties"
$keystoreFile = "android\narraverse-release.keystore"

if (-not (Test-Path $keystoreFile)) {
    Write-Host "  Generating new keystore..." -ForegroundColor Gray
    & keytool -genkey -v `
      -keystore $keystoreFile `
      -alias narraverse `
      -keyalg RSA -keysize 2048 -validity 10000 `
      -storepass narraverse2026 `
      -keypass narraverse2026 `
      -dname "CN=Narraverse, OU=Dev, O=Narraverse, L=Beijing, ST=Beijing, C=CN" `
      2>&1 | Out-Null

    Write-Host "  Creating keystore.properties..." -ForegroundColor Gray
    @"
storeFile=narraverse-release.keystore
storePassword=narraverse2026
keyAlias=narraverse
keyPassword=narraverse2026
"@ | Out-File -Encoding ascii $keystoreProps
} else {
    Write-Host "  Keystore found." -ForegroundColor Gray
}

# ─── 4. Build Next.js ───
Write-Host "[3/5] Building Next.js..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Next.js build failed" }

# ─── 5. Sync Capacitor ───
Write-Host "[4/5] Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync
if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }

# ─── 6. Build APK ───
Write-Host "[5/5] Building Android APK..." -ForegroundColor Yellow
Set-Location android
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) { throw "Android build failed" }
Set-Location ..

# ─── Done ───
$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "=== BUILD SUCCESS ===" -ForegroundColor Green
    Write-Host "APK: $apkPath" -ForegroundColor Green
    Write-Host "Size: ${apkSize}MB" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Upload $apkPath to GitHub Releases" -ForegroundColor Gray
} else {
    Write-Host "BUILD FAILED — APK not found" -ForegroundColor Red
    exit 1
}
