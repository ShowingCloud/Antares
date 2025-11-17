# PowerShell script to sync with Antares repository
# Usage: .\scripts\sync-with-antares.ps1

Write-Host "🔄 Syncing with Antares repository..." -ForegroundColor Cyan

# Fetch latest changes from upstream
Write-Host "📥 Fetching latest changes from upstream..." -ForegroundColor Yellow
git fetch upstream

# Check current branch
$currentBranch = git branch --show-current
Write-Host "📍 Current branch: $currentBranch" -ForegroundColor Green

# Merge upstream changes
Write-Host "🔀 Merging upstream changes..." -ForegroundColor Yellow
try {
    git merge upstream/main --no-edit
    Write-Host "✅ Merge completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Merge conflicts detected. Please resolve them manually." -ForegroundColor Red
    exit 1
}

# Push changes to origin (if you have write access)
$push = Read-Host "Push changes to origin? (y/n)"
if ($push -eq "y" -or $push -eq "Y") {
    Write-Host "📤 Pushing changes to origin..." -ForegroundColor Yellow
    git push origin $currentBranch
}

Write-Host "✅ Sync completed successfully!" -ForegroundColor Green

