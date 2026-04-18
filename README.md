# qr

Static Vite app with two deploy modes:

- `1`: deterministic motivational quotes
- `2`: validated redirect to either a reachable URL or a bundled file under `public/redirect-assets`

## Deploy config

The app reads [public/deploy-config.json](/Users/haki/Workspace/qr/public/deploy-config.json) at runtime.

Generate or refresh it locally with:

```bash
npm run prepare:deploy-config
```

Useful variants:

```bash
DEPLOY_VERSION=2 REDIRECT_TARGET=https://example.com npm run prepare:deploy-config
DEPLOY_VERSION=2 REDIRECT_TARGET=monkeys/middlefinger_monkey.jpg npm run prepare:deploy-config
```

Run tests with:

```bash
npm test
```
