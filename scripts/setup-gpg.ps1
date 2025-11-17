# GPG Setup Script for GitHub
# Run this script to set up GPG key signing for Git commits

Write-Host "=== GPG Key Setup for GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Check if GPG is available
$gpgPath = $null

# Check Git's bundled GPG first
if (Test-Path "C:\Program Files\Git\usr\bin\gpg.exe") {
    $gpgPath = "C:\Program Files\Git\usr\bin\gpg.exe"
    Write-Host "✓ Found GPG in Git installation" -ForegroundColor Green
} elseif (Get-Command gpg -ErrorAction SilentlyContinue) {
    $gpgPath = "gpg"
    Write-Host "✓ Found GPG in PATH" -ForegroundColor Green
} else {
    Write-Host "✗ GPG not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Gpg4win:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.gpg4win.org/" -ForegroundColor Yellow
    Write-Host "2. Install Gpg4win" -ForegroundColor Yellow
    Write-Host "3. Restart your terminal and run this script again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use Git's bundled GPG if available." -ForegroundColor Yellow
    exit 1
}

# Check for existing keys
Write-Host ""
Write-Host "Checking for existing GPG keys..." -ForegroundColor Cyan
$existingKeys = & $gpgPath --list-secret-keys --keyid-format=long 2>&1

if ($existingKeys -match "sec") {
    Write-Host "✓ Found existing GPG keys:" -ForegroundColor Green
    Write-Host $existingKeys -ForegroundColor Gray
    
    $useExisting = Read-Host "`nUse existing key? (y/n)"
    if ($useExisting -eq "y" -or $useExisting -eq "Y") {
        # Extract key ID
        $keyId = ($existingKeys | Select-String -Pattern "sec\s+rsa\d+/(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value } | Select-Object -First 1)
        
        if ($keyId) {
            Write-Host "`nUsing key ID: $keyId" -ForegroundColor Green
            
            # Configure Git
            git config --global user.signingkey $keyId
            git config --global commit.gpgsign true
            
            Write-Host "`n✓ Git configured to use GPG key" -ForegroundColor Green
            Write-Host ""
            Write-Host "Export your public key:" -ForegroundColor Yellow
            Write-Host "& `"$gpgPath`" --armor --export $keyId" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Add it to GitHub: https://github.com/settings/gpg/new" -ForegroundColor Cyan
            exit 0
        }
    }
}

# Generate new key
Write-Host ""
Write-Host "Generating new GPG key..." -ForegroundColor Cyan
Write-Host "You will be prompted for:" -ForegroundColor Yellow
Write-Host "  - Key type (press Enter for default RSA and RSA)" -ForegroundColor Gray
Write-Host "  - Key size (press Enter for 3072 or type 4096)" -ForegroundColor Gray
Write-Host "  - Expiration (press Enter for no expiration)" -ForegroundColor Gray
Write-Host "  - Your name" -ForegroundColor Gray
Write-Host "  - Your email (must match GitHub email)" -ForegroundColor Gray
Write-Host "  - Passphrase (choose a strong one)" -ForegroundColor Gray
Write-Host ""

# Get user info
$userName = Read-Host "Enter your full name"
$userEmail = Read-Host "Enter your GitHub email address"

if ([string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($userEmail)) {
    Write-Host "Name and email are required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Generating key (this may take a moment)..." -ForegroundColor Yellow

# Generate key using batch mode
$batchConfig = @"
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: $userName
Name-Email: $userEmail
Expire-Date: 0
%no-protection
%commit
"@

$tempFile = [System.IO.Path]::GetTempFileName()
$batchConfig | Out-File -FilePath $tempFile -Encoding ASCII

try {
    & $gpgPath --batch --generate-key $tempFile 2>&1 | Out-Null
    
    # Get the new key ID
    $keyList = & $gpgPath --list-secret-keys --keyid-format=long 2>&1
    $keyId = ($keyList | Select-String -Pattern "sec\s+rsa\d+/(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value } | Select-Object -First 1)
    
    if ($keyId) {
        Write-Host "✓ GPG key generated successfully!" -ForegroundColor Green
        Write-Host "  Key ID: $keyId" -ForegroundColor Cyan
        
        # Configure Git
        git config --global user.signingkey $keyId
        git config --global commit.gpgsign true
        
        Write-Host ""
        Write-Host "✓ Git configured to use GPG key" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== Next Steps ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Export your public key:" -ForegroundColor Yellow
        Write-Host "   & `"$gpgPath`" --armor --export $keyId" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Copy the entire output (including BEGIN and END lines)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "3. Add it to GitHub:" -ForegroundColor Yellow
        Write-Host "   https://github.com/settings/gpg/new" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "4. Test your setup:" -ForegroundColor Yellow
        Write-Host "   git commit --allow-empty -m `"Test GPG signing`"" -ForegroundColor Cyan
        Write-Host ""
        
        # Export the key automatically
        Write-Host "Exporting public key..." -ForegroundColor Yellow
        $publicKey = & $gpgPath --armor --export $keyId
        Write-Host ""
        Write-Host "=== Your Public Key ===" -ForegroundColor Cyan
        Write-Host $publicKey -ForegroundColor Gray
        Write-Host ""
        Write-Host "Copy the above key and add it to GitHub!" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Could not find generated key. Please generate manually:" -ForegroundColor Red
        Write-Host "  & `"$gpgPath`" --full-generate-key" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Error generating key: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try generating manually:" -ForegroundColor Yellow
    Write-Host "  & `"$gpgPath`" --full-generate-key" -ForegroundColor Cyan
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

