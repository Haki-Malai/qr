# Deployment Guide

This project uses one deployment flow through GitHub Actions.

## How to Deploy

### Via GitHub Actions (Recommended)

1. Go to your GitHub repository.
2. Click **Actions**.
3. Select the **Build and Deploy** workflow.
4. Click **Run workflow**.
5. Optional: fill in `redirect_target`.
    - leave it blank to deploy the quotes app
   - `https://...`, `http://...`, or a bare domain like `hakimalai.com` is treated as a URL and validated with `HEAD`, then `GET` if needed
   - anything else is treated as search text for image filenames under `public/redirect-assets`
   - `%` and `*` work as wildcards, so `%monkey%` matches any image filename containing `monkey`
   - when multiple images match, the first match in sorted path order is used
6. Click **Run workflow**.

## Local Testing

Generate the runtime config first:

```bash
npm run prepare:deploy-config
REDIRECT_TARGET='' npm run prepare:deploy-config
REDIRECT_TARGET=https://example.com npm run prepare:deploy-config
REDIRECT_TARGET=hakimalai.com npm run prepare:deploy-config
REDIRECT_TARGET=%monkey% npm run prepare:deploy-config
REDIRECT_TARGET=middlefinger_monkey npm run prepare:deploy-config
```

Then run:

```bash
npm run build
npm run preview
```

## Behavior

- blank `redirect_target`: motivational quotes
- valid reachable `http(s)` URL, or a bare domain like `hakimalai.com`: redirect there
- plain text: redirect to the first matching image under `public/redirect-assets`

## Automatic Deployment

Pushes to `main` still deploy the quotes app by default.
