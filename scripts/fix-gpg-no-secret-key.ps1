# Fix "no secret key" error for Git GPG signing
# This script helps diagnose and fix GPG key issues

$gpgPath = git config --global --get gpg.program

if (-not $gpgPath) {
    # Try to find GPG in common locations
    $gpgLocations = @(
        "D:\Program Files (x86)\GnuPG\bin\gpg.exe",
        "D:\Program Files\Git\usr\bin\gpg.exe",
        "C:\Program Files (x86)\GnuPG\bin\gpg.exe"
    )
    
    foreach ($location in $gpgLocations) {
        if (Test-Path $location) {
            $gpgPath = $location
            git config --global gpg.program $gpgPath
            Write-Host "✓ Configured GPG path: $gpgPath" -ForegroundColor Green
            break
        }
    }
    
    if (-not $gpgPath) {
        Write-Host "✗ GPG not found. Please install Gpg4win or configure gpg.program manually." -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== Diagnosing GPG Key Issue ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "GPG Path: $gpgPath" -ForegroundColor Gray
Write-Host ""

# Check configured key
$configuredKey = git config --global --get user.signingkey
Write-Host "Configured signing key: $configuredKey" -ForegroundColor Yellow
Write-Host ""

# List all keys
Write-Host "Listing all GPG keys..." -ForegroundColor Yellow
$allKeys = & $gpgPath --list-secret-keys --keyid-format=long 2>&1

if ($allKeys -match "sec") {
    Write-Host "Found keys:" -ForegroundColor Green
    Write-Host $allKeys -ForegroundColor Gray
    
    # Extract key IDs
    $keyIds = [regex]::Matches($allKeys, "sec\s+rsa\d+/(\w+)") | ForEach-Object { $_.Groups[1].Value }
    
    Write-Host ""
    if ($configuredKey) {
        if ($keyIds -contains $configuredKey) {
            Write-Host "✓ Configured key found in keyring!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Testing key access..." -ForegroundColor Yellow
            $testResult = & $gpgPath --list-secret-keys $configuredKey 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Key is accessible" -ForegroundColor Green
            } else {
                Write-Host "✗ Key access failed" -ForegroundColor Red
                Write-Host $testResult -ForegroundColor Gray
            }
        } else {
            Write-Host "✗ Configured key ($configuredKey) not found in keyring" -ForegroundColor Red
            Write-Host ""
            Write-Host "Available keys:" -ForegroundColor Yellow
            foreach ($keyId in $keyIds) {
                Write-Host "  - $keyId" -ForegroundColor Cyan
            }
            Write-Host ""
            
            if ($keyIds.Count -gt 0) {
                $useFirst = Read-Host "Use first available key ($($keyIds[0]))? (y/n)"
                if ($useFirst -eq "y" -or $useFirst -eq "Y") {
                    git config --global user.signingkey $keyIds[0]
                    Write-Host "✓ Updated signing key to: $($keyIds[0])" -ForegroundColor Green
                }
            } else {
                Write-Host "No keys available. Generate one:" -ForegroundColor Yellow
                Write-Host "  & `"$gpgPath`" --full-generate-key" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "No signing key configured. Available keys:" -ForegroundColor Yellow
        foreach ($keyId in $keyIds) {
            Write-Host "  - $keyId" -ForegroundColor Cyan
        }
        
        if ($keyIds.Count -gt 0) {
            $useFirst = Read-Host "`nSet signing key to first available ($($keyIds[0]))? (y/n)"
            if ($useFirst -eq "y" -or $useFirst -eq "Y") {
                git config --global user.signingkey $keyIds[0]
                git config --global commit.gpgsign true
                Write-Host "✓ Configured signing key: $($keyIds[0])" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "✗ No GPG keys found" -ForegroundColor Red
    Write-Host ""
    Write-Host "The configured key ($configuredKey) doesn't exist in your keyring." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  1. Generate a new key:" -ForegroundColor Cyan
    Write-Host "     & `"$gpgPath`" --full-generate-key" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Import an existing key:" -ForegroundColor Cyan
    Write-Host "     & `"$gpgPath`" --import your-key.asc" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Remove the configured key ID:" -ForegroundColor Cyan
    Write-Host "     git config --global --unset user.signingkey" -ForegroundColor Gray
    Write-Host ""
}

# Final verification
Write-Host ""
Write-Host "=== Final Configuration ===" -ForegroundColor Cyan
Write-Host "  gpg.program: $(git config --global --get gpg.program)" -ForegroundColor Gray
Write-Host "  user.signingkey: $(git config --global --get user.signingkey)" -ForegroundColor Gray
Write-Host "  commit.gpgsign: $(git config --global --get commit.gpgsign)" -ForegroundColor Gray
Write-Host ""

# Test commit signing
Write-Host "Test commit signing:" -ForegroundColor Yellow
Write-Host "  git commit --allow-empty -m `"Test GPG signing`"" -ForegroundColor Cyan
Write-Host ""

