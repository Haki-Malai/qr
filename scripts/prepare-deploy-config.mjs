import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDeployConfig } from './deploy-config.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '..');
const publicDir = path.join(repoRoot, 'public');
const deployConfigPath = path.join(publicDir, 'deploy-config.json');

async function deriveSiteOrigin() {
  if (process.env.SITE_ORIGIN?.trim()) {
    return process.env.SITE_ORIGIN.trim();
  }

  try {
    const cname = (await fs.readFile(path.join(publicDir, 'CNAME'), 'utf8')).trim();
    return cname ? `https://${cname}` : undefined;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

async function main() {
  const config = await resolveDeployConfig({
    version: process.env.DEPLOY_VERSION ?? '1',
    redirectTargetInput: process.env.REDIRECT_TARGET ?? '',
    publicDir,
    siteOrigin: await deriveSiteOrigin(),
  });

  await fs.writeFile(deployConfigPath, `${JSON.stringify(config, null, 2)}\n`);

  console.log(`Wrote deploy config to ${deployConfigPath}`);

  if (config.mode === 'redirect') {
    console.log(`Redirect target: ${config.redirectTarget} (${config.redirectTargetKind})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
