# Simple GPG Setup for GitHub
# This script helps you set up GPG key signing step by step

Write-Host "=== GPG Key Setup for GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if GPG is installed
Write-Host "Step 1: Checking for GPG..." -ForegroundColor Yellow

$gpgFound = $false
$gpgPath = $null

# Check common locations
$gpgLocations = @(
    "C:\Program Files\Git\usr\bin\gpg.exe",
    "C:\Program Files (x86)\GnuPG\bin\gpg.exe",
    "C:\Program Files\GnuPG\bin\gpg.exe"
)

foreach ($location in $gpgLocations) {
    if (Test-Path $location) {
        $gpgPath = $location
        $gpgFound = $true
        Write-Host "✓ Found GPG at: $location" -ForegroundColor Green
        break
    }
}

# Check PATH
if (-not $gpgFound) {
    try {
        $null = Get-Command gpg -ErrorAction Stop
        $gpgPath = "gpg"
        $gpgFound = $true
        Write-Host "✓ Found GPG in PATH" -ForegroundColor Green
    } catch {
        Write-Host "✗ GPG not found" -ForegroundColor Red
    }
}

if (-not $gpgFound) {
    Write-Host ""
    Write-Host "GPG is not installed. Please install it first:" -ForegroundColor Red
    Write-Host ""
    Write-Host "Option 1: Install Gpg4win (Recommended)" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.gpg4win.org/" -ForegroundColor Cyan
    Write-Host "  2. Run the installer" -ForegroundColor Cyan
    Write-Host "  3. Restart your terminal" -ForegroundColor Cyan
    Write-Host "  4. Run this script again" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 2: Use Git's GPG (if available)" -ForegroundColor Yellow
    Write-Host "  Some Git installations include GPG" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Step 2: Check for existing keys
Write-Host ""
Write-Host "Step 2: Checking for existing GPG keys..." -ForegroundColor Yellow

$keyOutput = & $gpgPath --list-secret-keys --keyid-format=long 2>&1

if ($keyOutput -match "sec\s+rsa\d+/(\w+)") {
    Write-Host "✓ Found existing keys" -ForegroundColor Green
    
    # Extract all key IDs
    $keyIds = [regex]::Matches($keyOutput, "sec\s+rsa\d+/(\w+)") | ForEach-Object { $_.Groups[1].Value }
    
    Write-Host ""
    Write-Host "Existing keys:" -ForegroundColor Cyan
    $keyOutput | Write-Host -ForegroundColor Gray
    
    $useExisting = Read-Host "`nUse an existing key? (y/n)"
    
    if ($useExisting -eq "y" -or $useExisting -eq "Y") {
        if ($keyIds.Count -eq 1) {
            $selectedKeyId = $keyIds[0]
        } else {
            Write-Host ""
            Write-Host "Select a key:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $keyIds.Count; $i++) {
                Write-Host "  $($i + 1). $($keyIds[$i])" -ForegroundColor Cyan
            }
            $selection = Read-Host "Enter number"
            $selectedKeyId = $keyIds[[int]$selection - 1]
        }
        
        Write-Host ""
        Write-Host "Using key: $selectedKeyId" -ForegroundColor Green
        
        # Configure Git
        git config --global user.signingkey $selectedKeyId
        git config --global commit.gpgsign true
        
        Write-Host "✓ Git configured!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== Export Your Public Key ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Run this command to export your public key:" -ForegroundColor Yellow
        Write-Host "  & `"$gpgPath`" --armor --export $selectedKeyId" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Then add it to GitHub: https://github.com/settings/gpg/new" -ForegroundColor Cyan
        exit 0
    }
}

# Step 3: Generate new key
Write-Host ""
Write-Host "Step 3: Generate new GPG key" -ForegroundColor Yellow
Write-Host ""
Write-Host "You'll need to provide:" -ForegroundColor Gray
Write-Host "  - Your full name" -ForegroundColor Gray
Write-Host "  - Your GitHub email address" -ForegroundColor Gray
Write-Host "  - A passphrase (choose a strong one)" -ForegroundColor Gray
Write-Host ""

$proceed = Read-Host "Proceed with key generation? (y/n)"
if ($proceed -ne "y" -and $proceed -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting interactive key generation..." -ForegroundColor Yellow
Write-Host "Follow the prompts in the GPG window." -ForegroundColor Gray
Write-Host ""

# Generate key interactively
& $gpgPath --full-generate-key

# Get the new key ID
Write-Host ""
Write-Host "Retrieving new key ID..." -ForegroundColor Yellow
$newKeyOutput = & $gpgPath --list-secret-keys --keyid-format=long 2>&1

if ($newKeyOutput -match "sec\s+rsa\d+/(\w+)") {
    $newKeyId = [regex]::Match($newKeyOutput, "sec\s+rsa\d+/(\w+)").Groups[1].Value
    
    Write-Host "✓ Key generated: $newKeyId" -ForegroundColor Green
    
    # Configure Git
    git config --global user.signingkey $newKeyId
    git config --global commit.gpgsign true
    
    Write-Host "✓ Git configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Export Your Public Key ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Export the key
    $publicKey = & $gpgPath --armor --export $newKeyId
    
    Write-Host $publicKey -ForegroundColor Gray
    Write-Host ""
    Write-Host "=== Next Steps ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Copy the public key above (including BEGIN and END lines)" -ForegroundColor Yellow
    Write-Host "2. Go to: https://github.com/settings/gpg/new" -ForegroundColor Cyan
    Write-Host "3. Paste the key and click 'Add GPG key'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "4. Test your setup:" -ForegroundColor Yellow
    Write-Host "   git commit --allow-empty -m `"Test GPG signing`"" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "✗ Could not find generated key" -ForegroundColor Red
    Write-Host "Please check manually: & `"$gpgPath`" --list-secret-keys" -ForegroundColor Yellow
}

