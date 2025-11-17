# GPG Troubleshooting Guide

## Issue: "gpg: signing failed: No secret key"

This error means Git is configured to sign commits, but GPG can't find the secret key.

### Solution 1: Generate a New Key

If you don't have a GPG key yet:

```powershell
.\scripts\generate-gpg-key.ps1
```

Or manually:
```powershell
& "D:\Program Files\Git\usr\bin\gpg.exe" --full-generate-key
```

Then configure Git:
```powershell
# Get your key ID
& "D:\Program Files\Git\usr\bin\gpg.exe" --list-secret-keys --keyid-format=long

# Set it in Git (replace YOUR_KEY_ID)
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

### Solution 2: Fix Existing Configuration

If you have a key but Git can't find it:

```powershell
.\scripts\fix-gpg-no-secret-key.ps1
```

This script will:
- Check if GPG is configured correctly
- List all available keys
- Help you select the correct key
- Update Git configuration

### Solution 3: Configure GPG Path

If GPG works in CMD but not PowerShell:

```powershell
# Set the full path to GPG
git config --global gpg.program "D:\Program Files\Git\usr\bin\gpg.exe"

# Verify
git config --global --get gpg.program
```

### Solution 4: Remove Signing (Temporary)

If you want to disable commit signing temporarily:

```powershell
git config --global commit.gpgsign false
```

To re-enable later:
```powershell
git config --global commit.gpgsign true
```

## Issue: GPG Not Found in PowerShell

GPG might be available in CMD but not PowerShell if it's not in PATH.

### Solution: Configure Git to Use Full Path

```powershell
# Find GPG (usually in Git installation)
$gpgPath = "D:\Program Files\Git\usr\bin\gpg.exe"

# Configure Git
git config --global gpg.program $gpgPath

# Verify
git config --global --get gpg.program
```

## Issue: Wrong Key ID Configured

If you have keys but the configured key ID doesn't match:

```powershell
# List all keys
& "D:\Program Files\Git\usr\bin\gpg.exe" --list-secret-keys --keyid-format=long

# Update to correct key ID
git config --global user.signingkey YOUR_CORRECT_KEY_ID
```

## Quick Fix Script

Run this to automatically fix common issues:

```powershell
.\scripts\configure-gpg-git.ps1
```

## Testing Your Setup

After configuration, test with:

```powershell
# Make a test commit
git commit --allow-empty -m "Test GPG signing"

# Check the signature
git log --show-signature -1
```

You should see "Good signature" in the output.

## Common Commands

```powershell
# List all keys
& "D:\Program Files\Git\usr\bin\gpg.exe" --list-secret-keys --keyid-format=long

# Export public key
& "D:\Program Files\Git\usr\bin\gpg.exe" --armor --export YOUR_KEY_ID

# Check Git GPG configuration
git config --global --get gpg.program
git config --global --get user.signingkey
git config --global --get commit.gpgsign

# Test GPG directly
& "D:\Program Files\Git\usr\bin\gpg.exe" --version
```

## Still Having Issues?

1. **Check GPG is working:**
   ```powershell
   & "D:\Program Files\Git\usr\bin\gpg.exe" --version
   ```

2. **Verify key exists:**
   ```powershell
   & "D:\Program Files\Git\usr\bin\gpg.exe" --list-secret-keys
   ```

3. **Check Git configuration:**
   ```powershell
   git config --global --list | Select-String gpg
   ```

4. **Try a test commit:**
   ```powershell
   git commit --allow-empty -m "Test" -S
   ```

The `-S` flag forces signing even if `commit.gpgsign` is false.

