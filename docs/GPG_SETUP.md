# GPG Key Setup for GitHub

This guide will help you set up a GPG key for signing commits on GitHub.

## Installation

### Windows

1. **Install Gpg4win:**
   - Download from: https://www.gpg4win.org/
   - Run the installer
   - Make sure to check "GPA" (GNU Privacy Assistant) during installation

2. **Or use Git's bundled GPG (if available):**
   - Git for Windows may include GPG
   - Check: `C:\Program Files\Git\usr\bin\gpg.exe`

### Alternative: Use Git's GPG

If Git is installed, it may include GPG. Try:
```powershell
& "C:\Program Files\Git\usr\bin\gpg.exe" --version
```

## Generate GPG Key

1. **Open PowerShell or Command Prompt**

2. **Generate a new GPG key:**
   ```powershell
   gpg --full-generate-key
   ```

3. **Follow the prompts:**
   - **Kind of key:** Press `1` for RSA and RSA (default)
   - **Key size:** Press `Enter` for 3072 bits (or type `4096` for stronger)
   - **Expiration:** Press `Enter` for no expiration (or specify a date)
   - **Real name:** Enter your full name
   - **Email address:** Enter your GitHub email address (must match GitHub account)
   - **Comment:** Optional, press `Enter` to skip
   - **Confirm:** Type `O` for Okay
   - **Passphrase:** Enter a strong passphrase (you'll need this for signing)

## Get Your GPG Key ID

After generating the key, get your key ID:

```powershell
gpg --list-secret-keys --keyid-format=long
```

Look for a line like:
```
sec   rsa4096/3AA5C34371567BD2 2024-01-01 [SC]
```

The key ID is the part after the `/` (e.g., `3AA5C34371567BD2`).

## Export Your Public Key

Export your public key to add to GitHub:

```powershell
gpg --armor --export YOUR_KEY_ID
```

Replace `YOUR_KEY_ID` with your actual key ID from the previous step.

Copy the entire output including:
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
...
-----END PGP PUBLIC KEY BLOCK-----
```

## Add Key to GitHub

1. Go to GitHub → Settings → SSH and GPG keys
2. Click "New GPG key"
3. Paste your public key
4. Click "Add GPG key"

## Configure Git to Use Your Key

1. **Set your GPG key in Git:**
   ```powershell
   git config --global user.signingkey YOUR_KEY_ID
   ```

2. **Enable commit signing:**
   ```powershell
   git config --global commit.gpgsign true
   ```

3. **Verify configuration:**
   ```powershell
   git config --global user.signingkey
   git config --global commit.gpgsign
   ```

## Test Your Setup

1. **Make a test commit:**
   ```powershell
   git commit --allow-empty -m "Test GPG signing"
   ```

2. **Verify the signature:**
   ```powershell
   git log --show-signature -1
   ```

You should see "Good signature" in the output.

## Troubleshooting

### GPG not found
- Make sure Gpg4win is installed
- Add GPG to your PATH: `C:\Program Files (x86)\GnuPG\bin`
- Restart your terminal

### "gpg: signing failed: Inappropriate ioctl for device"
- On Windows, you may need to set:
  ```powershell
  $env:GPG_TTY = "tty"
  ```

### "gpg: signing failed: No secret key"
- Make sure you're using the correct key ID
- Verify the key exists: `gpg --list-secret-keys`

### Passphrase prompts
- Consider using a GPG agent to cache your passphrase
- Or use a credential manager

## Quick Setup Script

Save this as `setup-gpg.ps1` and run it:

```powershell
# Check if GPG is installed
if (!(Get-Command gpg -ErrorAction SilentlyContinue)) {
    Write-Host "GPG not found. Please install Gpg4win from https://www.gpg4win.org/" -ForegroundColor Red
    exit 1
}

# Generate key (interactive)
Write-Host "Generating GPG key. Follow the prompts..." -ForegroundColor Yellow
gpg --full-generate-key

# Get the key ID
$keyId = (gpg --list-secret-keys --keyid-format=long | Select-String -Pattern "sec\s+rsa\d+/(\w+)" | ForEach-Object { $_.Matches.Groups[1].Value } | Select-Object -First 1)

if ($keyId) {
    Write-Host "Key ID: $keyId" -ForegroundColor Green
    
    # Configure Git
    git config --global user.signingkey $keyId
    git config --global commit.gpgsign true
    
    Write-Host "`nExport your public key:" -ForegroundColor Yellow
    Write-Host "gpg --armor --export $keyId" -ForegroundColor Cyan
    Write-Host "`nCopy the output and add it to GitHub:" -ForegroundColor Yellow
    Write-Host "https://github.com/settings/gpg/new" -ForegroundColor Cyan
} else {
    Write-Host "Could not find key ID. Please set it manually." -ForegroundColor Red
}
```

## Resources

- [GitHub: About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)
- [Gpg4win Download](https://www.gpg4win.org/)
- [Git Signing Commits](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work)

