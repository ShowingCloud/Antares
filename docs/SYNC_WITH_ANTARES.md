# Syncing with Antares Repository

This repository is synchronized with [Antares](https://github.com/ShowingCloud/Antares), a project on automated content generation with CJ affiliations.

## Setup

### 1. Add Upstream Remote

If you haven't already, add the Antares repository as an upstream remote:

```bash
git remote add upstream https://github.com/ShowingCloud/Antares.git
```

Verify it's added:
```bash
git remote -v
```

### 2. Fetch Latest Changes

Fetch the latest changes from Antares:
```bash
git fetch upstream
```

## Manual Sync

### Using Scripts

**On Linux/Mac:**
```bash
chmod +x scripts/sync-with-antares.sh
./scripts/sync-with-antares.sh
```

**On Windows (PowerShell):**
```powershell
.\scripts\sync-with-antares.ps1
```

### Manual Git Commands

1. **Fetch latest changes:**
   ```bash
   git fetch upstream
   ```

2. **Merge upstream changes:**
   ```bash
   git merge upstream/main --no-edit
   ```

3. **Resolve conflicts (if any):**
   ```bash
   # Edit conflicted files
   git add .
   git commit
   ```

4. **Push to your repository:**
   ```bash
   git push origin main
   ```

## Automatic Sync

### GitHub Actions

A GitHub Actions workflow is configured to automatically sync with Antares daily at 2 AM UTC.

The workflow:
- Fetches latest changes from Antares
- Attempts to merge automatically
- Creates a PR if conflicts are detected
- Pushes changes if merge is successful

**Manual Trigger:**
You can also trigger the sync manually from the GitHub Actions tab:
1. Go to Actions → Sync with Antares
2. Click "Run workflow"

### Vercel Cron (Alternative)

If you prefer, you can also set up a cron job to call the sync API endpoint (if you create one).

## Sync Strategy

### What Gets Synced

- Core functionality from Antares
- Bug fixes and improvements
- Shared utilities and types

### What Stays Local

- HostingHub-specific features
- Custom configurations
- Local environment variables
- Project-specific documentation

## Handling Conflicts

If merge conflicts occur:

1. **Review conflicts:**
   ```bash
   git status
   ```

2. **Open conflicted files** and look for conflict markers:
   ```
   <<<<<<< HEAD
   Your changes
   =======
   Changes from Antares
   >>>>>>> upstream/main
   ```

3. **Resolve conflicts** by:
   - Keeping your changes
   - Keeping Antares changes
   - Combining both
   - Creating a new solution

4. **Complete the merge:**
   ```bash
   git add .
   git commit
   ```

## Best Practices

1. **Regular Syncs:** Sync at least weekly to avoid large conflicts
2. **Test After Sync:** Always test your application after syncing
3. **Review Changes:** Check what changed before merging
4. **Backup First:** Commit or stash your changes before syncing
5. **Branch Strategy:** Consider syncing on a separate branch first

## Troubleshooting

### Remote Already Exists

If you get "remote upstream already exists":
```bash
git remote set-url upstream https://github.com/ShowingCloud/Antares.git
```

### Upstream Branch Not Found

If `upstream/main` doesn't exist, check the actual branch name:
```bash
git ls-remote --heads upstream
```

### Large Conflicts

For large conflicts, consider:
1. Syncing more frequently
2. Using a merge tool (e.g., VS Code, Meld)
3. Creating a separate sync branch for testing

## Related Links

- [Antares Repository](https://github.com/ShowingCloud/Antares)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

