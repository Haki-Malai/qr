import fs from 'node:fs/promises';
import path from 'node:path';

export const REDIRECT_ASSET_DIRNAME = 'redirect-assets';
export const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

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

export function parseDeployConfig(value) {
  if (!isPlainObject(value) || typeof value.mode !== 'string') {
    return null;
  }

  if (value.mode === 'quotes' && hasExactKeys(value, ['mode'])) {
    return { mode: 'quotes' };
  }

  if (
    value.mode === 'redirect' &&
    typeof value.redirectTarget === 'string' &&
    value.redirectTarget.length > 0 &&
    (value.redirectTargetKind === 'url' || value.redirectTargetKind === 'file') &&
    hasExactKeys(value, ['mode', 'redirectTarget', 'redirectTargetKind'])
  ) {
    return {
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

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildImageSearchPattern(input) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('Image search text cannot be empty.');
  }

  const hasWildcard = /[%*]/.test(trimmed);
  let pattern = '';

  for (const char of trimmed) {
    if (char === '%' || char === '*') {
      pattern += '.*';
      continue;
    }

    pattern += escapeRegex(char);
  }

  if (!hasWildcard) {
    pattern = `.*${pattern}.*`;
  }

  return new RegExp(pattern, 'i');
}

function encodePathSegments(relativePath) {
  return relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function isValidImageAsset(filename) {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

async function listImageAssets(assetRoot, currentDir = assetRoot) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listImageAssets(assetRoot, entryPath)));
      continue;
    }

    if (entry.isFile() && isValidImageAsset(entry.name)) {
      files.push(path.relative(assetRoot, entryPath).split(path.sep).join('/'));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export async function resolveImageSearchRedirectTarget(searchText, publicDir) {
  const assetRoot = path.resolve(publicDir, REDIRECT_ASSET_DIRNAME);
  const searchPattern = buildImageSearchPattern(searchText);
  const imageAssets = await listImageAssets(assetRoot);

  const match = imageAssets.find((relativePath) => {
    const basename = path.posix.basename(relativePath);
    return searchPattern.test(basename) || searchPattern.test(relativePath);
  });

  if (!match) {
    throw new Error(`No image file under public/redirect-assets matches "${searchText.trim()}".`);
  }

  return {
    mode: 'redirect',
    redirectTarget: `/${REDIRECT_ASSET_DIRNAME}/${encodePathSegments(match)}`,
    redirectTargetKind: 'file',
  };
}

export function parseHttpUrl(input) {
  const trimmed = input.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  let url;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`"${trimmed}" is not a valid HTTP(S) URL.`);
  }

  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) {
    throw new Error(`"${trimmed}" is not a valid HTTP(S) URL.`);
  }

  return url.toString();
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

export async function resolveDeployConfig({
  redirectTargetInput = '',
  publicDir,
  fetchImpl = fetch,
}) {
  const trimmedInput = redirectTargetInput.trim();

  if (!trimmedInput) {
    return { mode: 'quotes' };
  }

  const url = parseHttpUrl(trimmedInput);

  if (url) {
    await assertUrlReachable(url, fetchImpl);

    return {
      mode: 'redirect',
      redirectTarget: url,
      redirectTargetKind: 'url',
    };
  }

  return resolveImageSearchRedirectTarget(trimmedInput, publicDir);
}
