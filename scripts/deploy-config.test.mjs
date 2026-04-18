import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_REDIRECT_TARGET, resolveDeployConfig, resolveRequestedVersion } from './deploy-config.mjs';

async function makePublicDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qr-deploy-config-'));
  const publicDir = path.join(tempDir, 'public');

  await fs.mkdir(path.join(publicDir, 'redirect-assets', 'monkeys'), { recursive: true });
  await fs.writeFile(path.join(publicDir, 'redirect-assets', 'monkeys', 'middlefinger_monkey.jpg'), 'image');

  return publicDir;
}

async function withPublicDir(run) {
  const publicDir = await makePublicDir();

  try {
    await run(publicDir);
  } finally {
    await fs.rm(path.dirname(publicDir), { recursive: true, force: true });
  }
}

test('accepts a reachable external URL after HEAD falls back to GET', async () => {
  await withPublicDir(async (publicDir) => {
    const calls = [];
    const fetchImpl = async (_url, options = {}) => {
      calls.push(options.method ?? 'GET');

      if ((options.method ?? 'GET') === 'HEAD') {
        return new Response(null, { status: 405 });
      }

      return new Response(null, { status: 302 });
    };

    const config = await resolveDeployConfig({
      version: 2,
      redirectTargetInput: 'https://example.com/next',
      publicDir,
      fetchImpl,
    });

    assert.deepEqual(config, {
      version: 2,
      mode: 'redirect',
      redirectTarget: 'https://example.com/next',
      redirectTargetKind: 'url',
    });
    assert.deepEqual(calls, ['HEAD', 'GET']);
  });
});

test('defaults to version 2 when a redirect target is provided without an explicit version', () => {
  assert.equal(resolveRequestedVersion(undefined, 'https://example.com'), 2);
  assert.equal(resolveRequestedVersion('', 'monkeys/middlefinger_monkey.jpg'), 2);
});

test('defaults to version 1 when no explicit version or redirect target is provided', () => {
  assert.equal(resolveRequestedVersion(undefined, ''), 1);
  assert.equal(resolveRequestedVersion('   ', '   '), 1);
});

test('rejects an external URL when both HEAD and GET fail validation', async () => {
  await withPublicDir(async (publicDir) => {
    const fetchImpl = async (_url, options = {}) =>
      new Response(null, { status: (options.method ?? 'GET') === 'HEAD' ? 500 : 404 });

    await assert.rejects(
      resolveDeployConfig({
        version: 2,
        redirectTargetInput: 'https://example.com/broken',
        publicDir,
        fetchImpl,
      }),
      /returned 404/i,
    );
  });
});

test('accepts a nested redirect file path under public/redirect-assets', async () => {
  await withPublicDir(async (publicDir) => {
    await fs.mkdir(path.join(publicDir, 'redirect-assets', 'animals', 'monkeys'), { recursive: true });
    await fs.writeFile(
      path.join(publicDir, 'redirect-assets', 'animals', 'monkeys', 'wave.txt'),
      'hello',
    );

    const config = await resolveDeployConfig({
      version: 2,
      redirectTargetInput: 'animals/monkeys/wave.txt',
      publicDir,
    });

    assert.deepEqual(config, {
      version: 2,
      mode: 'redirect',
      redirectTarget: '/redirect-assets/animals/monkeys/wave.txt',
      redirectTargetKind: 'file',
    });
  });
});

test('rejects a missing redirect file path', async () => {
  await withPublicDir(async (publicDir) => {
    await assert.rejects(
      resolveDeployConfig({
        version: 2,
        redirectTargetInput: 'monkeys/missing.jpg',
        publicDir,
      }),
      /does not exist/i,
    );
  });
});

test('rejects redirect file path traversal outside the asset root', async () => {
  await withPublicDir(async (publicDir) => {
    await assert.rejects(
      resolveDeployConfig({
        version: 2,
        redirectTargetInput: '../secret.txt',
        publicDir,
      }),
      /must stay within public\/redirect-assets/i,
    );
  });
});

test('reuses the existing deployed redirect target when version 2 is blank', async () => {
  await withPublicDir(async (publicDir) => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          version: 2,
          mode: 'redirect',
          redirectTarget: 'https://example.com/existing',
          redirectTargetKind: 'url',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );

    const config = await resolveDeployConfig({
      version: 2,
      redirectTargetInput: '',
      publicDir,
      siteOrigin: 'https://qr.hakimalai.com',
      fetchImpl,
    });

    assert.deepEqual(config, {
      version: 2,
      mode: 'redirect',
      redirectTarget: 'https://example.com/existing',
      redirectTargetKind: 'url',
    });
  });
});

test('falls back to the bundled monkey asset when no previous deploy config exists', async () => {
  await withPublicDir(async (publicDir) => {
    const fetchImpl = async () => new Response(null, { status: 404 });

    const config = await resolveDeployConfig({
      version: 2,
      redirectTargetInput: '',
      publicDir,
      siteOrigin: 'https://qr.hakimalai.com',
      fetchImpl,
    });

    assert.deepEqual(config, {
      version: 2,
      mode: 'redirect',
      redirectTarget: DEFAULT_REDIRECT_TARGET,
      redirectTargetKind: 'file',
    });
  });
});
