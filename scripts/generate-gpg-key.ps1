# Generate a new GPG key for GitHub commit signing

$gpgPath = git config --global --get gpg.program

if (-not $gpgPath) {
    # Try common locations
    $gpgLocations = @(
        "D:\Program Files (x86)\GnuPG\bin\gpg.exe",
        "D:\Program Files\Git\usr\bin\gpg.exe",
        "C:\Program Files (x86)\GnuPG\bin\gpg.exe"
    )
    
    foreach ($location in $gpgLocations) {
        if (Test-Path $location) {
            $gpgPath = $location
            git config --global gpg.program $gpgPath
            break
        }
    }
    
    if (-not $gpgPath) {
        Write-Host "✗ GPG not found. Please configure gpg.program first." -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== Generate GPG Key for GitHub ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will generate a new GPG key for signing Git commits." -ForegroundColor Yellow
Write-Host ""

# Get user information
$userName = Read-Host "Enter your full name"
$userEmail = Read-Host "Enter your GitHub email address"

if ([string]::IsNullOrWhiteSpace($userName) -or [string]::IsNullOrWhiteSpace($userEmail)) {
    Write-Host "Name and email are required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Key generation options:" -ForegroundColor Yellow
Write-Host "  1. RSA 4096 bits (recommended, stronger)" -ForegroundColor Cyan
Write-Host "  2. RSA 3072 bits (faster, still secure)" -ForegroundColor Cyan
$keySize = Read-Host "Choose key size (1 or 2, default: 1)"

if ($keySize -eq "2") {
    $keyLength = "3072"
} else {
    $keyLength = "4096"
}

Write-Host ""
Write-Host "Generating GPG key..." -ForegroundColor Yellow
Write-Host "  Name: $userName" -ForegroundColor Gray
Write-Host "  Email: $userEmail" -ForegroundColor Gray
Write-Host "  Key size: $keyLength bits" -ForegroundColor Gray
Write-Host ""
Write-Host "You will be prompted for a passphrase. Choose a strong one!" -ForegroundColor Yellow
Write-Host ""

# Generate key interactively
& $gpgPath --full-generate-key

# Get the new key ID
Write-Host ""
Write-Host "Retrieving new key..." -ForegroundColor Yellow
$keys = & $gpgPath --list-secret-keys --keyid-format=long 2>&1

if ($keys -match "sec\s+rsa\d+/(\w+)") {
    $keyId = [regex]::Match($keys, "sec\s+rsa\d+/(\w+)").Groups[1].Value
    
    Write-Host "✓ Key generated: $keyId" -ForegroundColor Green
    
    # Configure Git
    git config --global user.signingkey $keyId
    git config --global commit.gpgsign true
    
    Write-Host "✓ Git configured to use new key" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Export Your Public Key ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Export public key
    $publicKey = & $gpgPath --armor --export $keyId
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
    Write-Host "Please check: & `"$gpgPath`" --list-secret-keys" -ForegroundColor Yellow
}

