# qr

Static Vite app with one deploy flow:

- leave `redirect_target` empty to deploy deterministic motivational quotes
- set `redirect_target` to a valid reachable `http(s)` URL, or a bare domain like `hakimalai.com`, to deploy a redirect there
- set `redirect_target` to plain text like `%monkey%` to deploy a redirect to the first matching image under `public/redirect-assets`

## Deploy config

The app reads [public/deploy-config.json](/Users/haki/Workspace/qr/public/deploy-config.json) at runtime.

Generate or refresh it locally with:

```bash
npm run prepare:deploy-config
```

Useful variants:

```bash
REDIRECT_TARGET='' npm run prepare:deploy-config
REDIRECT_TARGET=https://example.com npm run prepare:deploy-config
REDIRECT_TARGET=hakimalai.com npm run prepare:deploy-config
REDIRECT_TARGET=%monkey% npm run prepare:deploy-config
REDIRECT_TARGET=middlefinger_monkey npm run prepare:deploy-config
```

Run tests with:

```bash
npm test
```
