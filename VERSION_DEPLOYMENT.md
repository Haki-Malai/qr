# Version Deployment Guide

This project supports two deployment versions through GitHub Actions.

## How to Deploy a Different Version

### Via GitHub Actions (Recommended)

1. Go to your GitHub repository.
2. Click **Actions**.
3. Select the **Build and Deploy** workflow.
4. Click **Run workflow**.
5. Optional: fill in `redirect_target`.
   - `https://...` or `http://...` is validated with `HEAD`, then `GET` if needed.
   - Any other value is treated as a file path relative to `public/redirect-assets`.
   - A bare filename is accepted when it matches exactly one file anywhere under `public/redirect-assets`.
   - Subfolders are supported, for example `monkeys/middlefinger_monkey.jpg`.
   - Absolute paths and `..` are rejected.
6. Click **Run workflow**.

Manual workflow behavior:

- blank `redirect_target` deploys version `1`
- any non-empty `redirect_target` deploys version `2`
- the version selector is intentionally not shown in the Actions UI

If version `2` is requested outside the Actions UI and `redirect_target` is blank:

- the workflow fetches the currently deployed `deploy-config.json`
- an existing redirect target is reused
- a missing live config, or a live version `1` config, falls back to `/redirect-assets/monkeys/middlefinger_monkey.jpg`
- an unreadable or invalid live config fails the build

## Local Testing

Generate the runtime config first:

```bash
npm run prepare:deploy-config
REDIRECT_TARGET=https://example.com npm run prepare:deploy-config
REDIRECT_TARGET=middlefinger_monkey.jpg npm run prepare:deploy-config
REDIRECT_TARGET=monkeys/middlefinger_monkey.jpg npm run prepare:deploy-config
DEPLOY_VERSION=2 npm run prepare:deploy-config
```

Then run:

```bash
npm run build
npm run preview
```

## Version Details

### Version 1

The motivational quotes app.

### Version 2

Redirects to either:

- a validated external URL
- a validated file under `public/redirect-assets`

Default bundled fallback:

- `/redirect-assets/monkeys/middlefinger_monkey.jpg`

## Automatic Deployment

Pushes to `main` still deploy version `1` by default.
