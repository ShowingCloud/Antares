#!/bin/bash
# Sync script to keep this repository synchronized with Antares
# Usage: ./scripts/sync-with-antares.sh

set -e

echo "🔄 Syncing with Antares repository..."

# Fetch latest changes from upstream
echo "📥 Fetching latest changes from upstream..."
git fetch upstream

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Merge upstream changes
echo "🔀 Merging upstream changes..."
git merge upstream/main --no-edit || {
    echo "⚠️  Merge conflicts detected. Please resolve them manually."
    exit 1
}

# Push changes to origin (if you have write access)
read -p "Push changes to origin? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing changes to origin..."
    git push origin $CURRENT_BRANCH
fi

echo "✅ Sync completed successfully!"

