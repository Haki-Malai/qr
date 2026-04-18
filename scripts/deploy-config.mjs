import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_REDIRECT_ASSET_PATH = 'monkeys/middlefinger_monkey.jpg';
export const DEFAULT_REDIRECT_TARGET = '/redirect-assets/monkeys/middlefinger_monkey.jpg';
export const REDIRECT_ASSET_DIRNAME = 'redirect-assets';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  const valueKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();

  return (
    valueKeys.length === expectedKeys.length &&
    valueKeys.every((key, index) => key === expectedKeys[index])
  );
}

export function parseDeployVersion(value) {
  const version = Number(value);

  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported deploy version "${value}". Expected "1" or "2".`);
  }

  return version;
}

export function parseDeployConfig(value) {
  if (!isPlainObject(value) || typeof value.version !== 'number' || typeof value.mode !== 'string') {
    return null;
  }

  if (value.version === 1 && value.mode === 'quotes' && hasExactKeys(value, ['version', 'mode'])) {
    return { version: 1, mode: 'quotes' };
  }

  if (
    value.version === 2 &&
    value.mode === 'redirect' &&
    typeof value.redirectTarget === 'string' &&
    value.redirectTarget.length > 0 &&
    (value.redirectTargetKind === 'url' || value.redirectTargetKind === 'file') &&
    hasExactKeys(value, ['version', 'mode', 'redirectTarget', 'redirectTargetKind'])
  ) {
    return {
      version: 2,
      mode: 'redirect',
      redirectTarget: value.redirectTarget,
      redirectTargetKind: value.redirectTargetKind,
    };
  }

  return null;
}

function isSuccessfulStatus(status) {
  return status >= 200 && status < 400;
}

function sanitizeRedirectAssetPath(input) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('Redirect file path cannot be empty.');
  }

  if (trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    throw new Error('Redirect file path must be relative to public/redirect-assets.');
  }

  const normalized = path.posix.normalize(trimmed.replaceAll('\\', '/'));

  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.startsWith('/')
  ) {
    throw new Error('Redirect file path must stay within public/redirect-assets.');
  }

  return normalized;
}

function encodePathSegments(relativePath) {
  return relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export async function resolveFileRedirectTarget(relativePath, publicDir) {
  const sanitizedPath = sanitizeRedirectAssetPath(relativePath);
  const assetRoot = path.resolve(publicDir, REDIRECT_ASSET_DIRNAME);
  const absolutePath = path.resolve(assetRoot, sanitizedPath);
  const relativeToRoot = path.relative(assetRoot, absolutePath);

  if (
    relativeToRoot === '' ||
    relativeToRoot === '..' ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    throw new Error('Redirect file path must stay within public/redirect-assets.');
  }

  let stats;

  try {
    stats = await fs.stat(absolutePath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Redirect file "${sanitizedPath}" does not exist under public/redirect-assets.`);
    }

    throw error;
  }

  if (!stats.isFile()) {
    throw new Error(`Redirect file "${sanitizedPath}" is not a file.`);
  }

  return {
    version: 2,
    mode: 'redirect',
    redirectTarget: `/${REDIRECT_ASSET_DIRNAME}/${encodePathSegments(sanitizedPath)}`,
    redirectTargetKind: 'file',
  };
}

export async function assertUrlReachable(url, fetchImpl = fetch) {
  const attempts = ['HEAD', 'GET'];
  let lastFailure;

  for (const method of attempts) {
    try {
      const response = await fetchImpl(url, {
        method,
        redirect: 'manual',
        headers: { accept: '*/*' },
      });

      if (isSuccessfulStatus(response.status)) {
        return;
      }

      lastFailure = new Error(`${method} ${url} returned ${response.status}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastFailure = new Error(`${method} ${url} failed: ${message}`);
    }
  }

  throw lastFailure ?? new Error(`Unable to validate ${url}.`);
}

export async function readExistingDeployConfig(siteOrigin, fetchImpl = fetch) {
  if (!siteOrigin) {
    throw new Error('SITE_ORIGIN is required when resolving a blank redirect target for version 2.');
  }

  const configUrl = new URL('deploy-config.json', ensureTrailingSlash(siteOrigin)).toString();
  let response;

  try {
    response = await fetchImpl(configUrl, {
      redirect: 'manual',
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch existing deploy config from ${configUrl}: ${message}`);
  }

  if (response.status === 404) {
    return null;
  }

  if (!isSuccessfulStatus(response.status)) {
    throw new Error(`Existing deploy config request returned ${response.status}.`);
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error(`Existing deploy config at ${configUrl} is not valid JSON.`);
  }

  const config = parseDeployConfig(payload);

  if (!config) {
    throw new Error(`Existing deploy config at ${configUrl} is invalid.`);
  }

  return config;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

export async function resolveDeployConfig({
  version,
  redirectTargetInput = '',
  publicDir,
  siteOrigin,
  fetchImpl = fetch,
}) {
  const deployVersion = parseDeployVersion(version);

  if (deployVersion === 1) {
    return { version: 1, mode: 'quotes' };
  }

  const trimmedInput = redirectTargetInput.trim();

  if (trimmedInput) {
    if (/^https?:\/\//i.test(trimmedInput)) {
      await assertUrlReachable(trimmedInput, fetchImpl);

      return {
        version: 2,
        mode: 'redirect',
        redirectTarget: trimmedInput,
        redirectTargetKind: 'url',
      };
    }

    return resolveFileRedirectTarget(trimmedInput, publicDir);
  }

  const existingConfig = await readExistingDeployConfig(siteOrigin, fetchImpl);

  if (existingConfig?.mode === 'redirect') {
    return existingConfig;
  }

  return resolveFileRedirectTarget(DEFAULT_REDIRECT_ASSET_PATH, publicDir);
}
