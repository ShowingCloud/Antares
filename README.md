This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Syncing with Antares

This repository is synchronized with [Antares](https://github.com/ShowingCloud/Antares), a project on automated content generation with CJ affiliations.

### Quick Sync

```bash
npm run sync:antares
```

### Manual Sync

```bash
# Fetch latest changes
git fetch upstream

# Merge changes
git merge upstream/main --no-edit

# Push to your repository
git push origin main
```

For detailed sync instructions, see [docs/SYNC_WITH_ANTARES.md](docs/SYNC_WITH_ANTARES.md).

### Automatic Sync

A GitHub Actions workflow automatically syncs with Antares daily at 2 AM UTC. You can also trigger it manually from the Actions tab.

## GPG Key Setup

To sign your commits with a GPG key on GitHub:

### Quick Setup

Run the setup script:
```powershell
.\scripts\setup-gpg-simple.ps1
```

### Manual Setup

1. **Install Gpg4win** (if not installed):
   - Download from: https://www.gpg4win.org/
   - Install and restart your terminal

2. **Generate a GPG key:**
   ```powershell
   gpg --full-generate-key
   ```

3. **Get your key ID:**
   ```powershell
   gpg --list-secret-keys --keyid-format=long
   ```

4. **Export your public key:**
   ```powershell
   gpg --armor --export YOUR_KEY_ID
   ```

5. **Add to GitHub:**
   - Go to: https://github.com/settings/gpg/new
   - Paste your public key

6. **Configure Git:**
   ```powershell
   git config --global user.signingkey YOUR_KEY_ID
   git config --global commit.gpgsign true
   ```

For detailed instructions, see [docs/GPG_SETUP.md](docs/GPG_SETUP.md).
