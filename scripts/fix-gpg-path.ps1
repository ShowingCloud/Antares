# Fix GPG Path for PowerShell and Git
# This script finds GPG and configures Git to use it

Write-Host "=== Fixing GPG Path Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Check current Git GPG configuration
$currentGpgProgram = git config --global --get gpg.program
$currentSigningKey = git config --global --get user.signingkey

Write-Host "Current Git GPG configuration:" -ForegroundColor Yellow
Write-Host "  gpg.program: $currentGpgProgram" -ForegroundColor Gray
Write-Host "  user.signingkey: $currentSigningKey" -ForegroundColor Gray
Write-Host ""

# Search for GPG in common locations
Write-Host "Searching for GPG..." -ForegroundColor Yellow

$gpgPaths = @(
    "D:\Program Files (x86)\GnuPG\bin\gpg.exe",
    "C:\Program Files (x86)\GnuPG\bin\gpg.exe",
    "D:\Program Files\Git\usr\bin\gpg.exe",
    "C:\Program Files\Git\usr\bin\gpg.exe",
    "C:\Program Files\GnuPG\bin\gpg.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Gpg4win\bin\gpg.exe",
    "$env:LOCALAPPDATA\Programs\Gpg4win\bin\gpg.exe"
)

$foundGpg = $null

foreach ($path in $gpgPaths) {
    if (Test-Path $path) {
        Write-Host "  ✓ Found: $path" -ForegroundColor Green
        $foundGpg = $path
        break
    }
}

# Also check PATH
if (-not $foundGpg) {
    Write-Host "  Checking PATH..." -ForegroundColor Gray
    try {
        $gpgInPath = Get-Command gpg -ErrorAction Stop
        $foundGpg = $gpgInPath.Source
        Write-Host "  ✓ Found in PATH: $foundGpg" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Not in PATH" -ForegroundColor Red
    }
}

if (-not $foundGpg) {
    Write-Host ""
    Write-Host "✗ GPG not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Gpg4win:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.gpg4win.org/" -ForegroundColor Cyan
    Write-Host "  2. Install it" -ForegroundColor Cyan
    Write-Host "  3. Run this script again" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Test GPG
Write-Host ""
Write-Host "Testing GPG..." -ForegroundColor Yellow
try {
    $gpgVersion = & $foundGpg --version 2>&1 | Select-Object -First 1
    Write-Host "  ✓ GPG works: $gpgVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ GPG test failed: $_" -ForegroundColor Red
    exit 1
}

# Check for keys
Write-Host ""
Write-Host "Checking for GPG keys..." -ForegroundColor Yellow
$keys = & $foundGpg --list-secret-keys --keyid-format=long 2>&1

if ($keys -match "sec\s+rsa\d+/(\w+)") {
    $keyIds = [regex]::Matches($keys, "sec\s+rsa\d+/(\w+)") | ForEach-Object { $_.Groups[1].Value }
    Write-Host "  ✓ Found $($keyIds.Count) key(s)" -ForegroundColor Green
    
    foreach ($keyId in $keyIds) {
        Write-Host "    - $keyId" -ForegroundColor Cyan
    }
    
    # Use the first key or the configured one
    $keyToUse = $currentSigningKey
    if (-not $keyToUse -or $keyIds -notcontains $keyToUse) {
        $keyToUse = $keyIds[0]
        Write-Host ""
        Write-Host "Using key: $keyToUse" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "Using configured key: $keyToUse" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ No keys found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Generate a key first:" -ForegroundColor Yellow
    Write-Host "  & `"$foundGpg`" --full-generate-key" -ForegroundColor Cyan
    exit 1
}

# Configure Git to use the full path to GPG
Write-Host ""
Write-Host "Configuring Git..." -ForegroundColor Yellow

# Set GPG program path
git config --global gpg.program $foundGpg
Write-Host "  ✓ Set gpg.program: $foundGpg" -ForegroundColor Green

# Set signing key if not set
if (-not $currentSigningKey) {
    git config --global user.signingkey $keyToUse
    Write-Host "  ✓ Set user.signingkey: $keyToUse" -ForegroundColor Green
}

# Enable commit signing
git config --global commit.gpgsign true
Write-Host "  ✓ Enabled commit signing" -ForegroundColor Green

# Verify configuration
Write-Host ""
Write-Host "Verifying configuration..." -ForegroundColor Yellow
$verifyGpgProgram = git config --global --get gpg.program
$verifySigningKey = git config --global --get user.signingkey
$verifyGpgSign = git config --global --get commit.gpgsign

Write-Host "  gpg.program: $verifyGpgProgram" -ForegroundColor Gray
Write-Host "  user.signingkey: $verifySigningKey" -ForegroundColor Gray
Write-Host "  commit.gpgsign: $verifyGpgSign" -ForegroundColor Gray

# Test signing
Write-Host ""
Write-Host "Testing GPG signing..." -ForegroundColor Yellow
try {
    $testResult = & $foundGpg --list-secret-keys --keyid-format=long $verifySigningKey 2>&1
    if ($testResult -match "sec") {
        Write-Host "  ✓ Key is accessible" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Key might not be accessible" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Could not verify key: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Configuration Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test with: git commit --allow-empty -m `"Test GPG signing`"" -ForegroundColor Cyan
Write-Host "  2. Check signature: git log --show-signature -1" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you still get 'no secret key' error:" -ForegroundColor Yellow
Write-Host "  - Make sure your key ID matches: $verifySigningKey" -ForegroundColor Gray
Write-Host "  - Try: & `"$foundGpg`" --list-secret-keys" -ForegroundColor Gray
Write-Host ""

