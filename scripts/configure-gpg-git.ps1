# Configure Git to use GPG from Git installation
# This fixes the "no secret key" error

# Try to find GPG in common locations
$gpgPath = $null
$gpgLocations = @(
    "D:\Program Files (x86)\GnuPG\bin\gpg.exe",
    "D:\Program Files\Git\usr\bin\gpg.exe",
    "C:\Program Files (x86)\GnuPG\bin\gpg.exe",
    "C:\Program Files\GnuPG\bin\gpg.exe"
)

foreach ($location in $gpgLocations) {
    if (Test-Path $location) {
        $gpgPath = $location
        break
    }
}

if (-not $gpgPath) {
    Write-Host "GPG not found. Please update the path in this script." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $gpgPath)) {
    Write-Host "GPG not found at: $gpgPath" -ForegroundColor Red
    Write-Host "Please update the path in this script or install Gpg4win" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Configuring Git GPG ===" -ForegroundColor Cyan
Write-Host ""

# Set GPG program path
Write-Host "Setting Git GPG program..." -ForegroundColor Yellow
git config --global gpg.program $gpgPath
Write-Host "  ✓ Configured: $gpgPath" -ForegroundColor Green

# Check for existing keys
Write-Host ""
Write-Host "Checking for GPG keys..." -ForegroundColor Yellow
$keys = & $gpgPath --list-secret-keys --keyid-format=long 2>&1

if ($keys -match "sec\s+rsa\d+/(\w+)") {
    $keyIds = [regex]::Matches($keys, "sec\s+rsa\d+/(\w+)") | ForEach-Object { $_.Groups[1].Value }
    Write-Host "  ✓ Found $($keyIds.Count) key(s):" -ForegroundColor Green
    
    foreach ($keyId in $keyIds) {
        Write-Host "    - $keyId" -ForegroundColor Cyan
    }
    
    # Check if signing key is set
    $currentKey = git config --global --get user.signingkey
    
    if ($currentKey) {
        if ($keyIds -contains $currentKey) {
            Write-Host ""
            Write-Host "  ✓ Signing key configured: $currentKey" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "  ⚠ Configured key ($currentKey) not found in keyring" -ForegroundColor Yellow
            Write-Host "  Setting to first available key: $($keyIds[0])" -ForegroundColor Yellow
            git config --global user.signingkey $keyIds[0]
        }
    } else {
        Write-Host ""
        Write-Host "  Setting signing key to: $($keyIds[0])" -ForegroundColor Yellow
        git config --global user.signingkey $keyIds[0]
    }
    
    # Enable commit signing
    git config --global commit.gpgsign true
    Write-Host "  ✓ Commit signing enabled" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "=== Configuration Complete ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test with:" -ForegroundColor Yellow
    Write-Host "  git commit --allow-empty -m `"Test GPG signing`"" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "  ✗ No GPG keys found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Generate a key:" -ForegroundColor Yellow
    Write-Host "  & `"$gpgPath`" --full-generate-key" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use the existing key ID if you have one:" -ForegroundColor Yellow
    Write-Host "  git config --global user.signingkey YOUR_KEY_ID" -ForegroundColor Cyan
    Write-Host ""
}

# Verify configuration
Write-Host "Current Git GPG settings:" -ForegroundColor Cyan
Write-Host "  gpg.program: $(git config --global --get gpg.program)" -ForegroundColor Gray
Write-Host "  user.signingkey: $(git config --global --get user.signingkey)" -ForegroundColor Gray
Write-Host "  commit.gpgsign: $(git config --global --get commit.gpgsign)" -ForegroundColor Gray
Write-Host ""

