import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveDeployConfig } from './deploy-config.mjs';

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

test('uses quotes mode when redirect_target is left empty', async () => {
  await withPublicDir(async (publicDir) => {
    const config = await resolveDeployConfig({
      redirectTargetInput: '',
      publicDir,
    });

    assert.deepEqual(config, { mode: 'quotes' });
  });
});

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
      redirectTargetInput: 'https://example.com/next',
      publicDir,
      fetchImpl,
    });

    assert.deepEqual(config, {
      mode: 'redirect',
      redirectTarget: 'https://example.com/next',
      redirectTargetKind: 'url',
    });
    assert.deepEqual(calls, ['HEAD', 'GET']);
  });
});

test('rejects an invalid URL-like string before any reachability check', async () => {
  await withPublicDir(async (publicDir) => {
    await assert.rejects(
      resolveDeployConfig({
        redirectTargetInput: 'https://',
        publicDir,
      }),
      /not a valid HTTP\(S\) URL/i,
    );
  });
});

test('rejects an external URL when both HEAD and GET fail validation', async () => {
  await withPublicDir(async (publicDir) => {
    const fetchImpl = async (_url, options = {}) =>
      new Response(null, { status: (options.method ?? 'GET') === 'HEAD' ? 500 : 404 });

    await assert.rejects(
      resolveDeployConfig({
        redirectTargetInput: 'https://example.com/broken',
        publicDir,
        fetchImpl,
      }),
      /returned 404/i,
    );
  });
});

test('matches image names with wildcard text like %monkey%', async () => {
  await withPublicDir(async (publicDir) => {
    const config = await resolveDeployConfig({
      redirectTargetInput: '%monkey%',
      publicDir,
    });

    assert.deepEqual(config, {
      mode: 'redirect',
      redirectTarget: '/redirect-assets/monkeys/middlefinger_monkey.jpg',
      redirectTargetKind: 'file',
    });
  });
});

test('matches image names by plain substring when the input is not URL-like', async () => {
  await withPublicDir(async (publicDir) => {
    const config = await resolveDeployConfig({
      redirectTargetInput: 'finger',
      publicDir,
    });

    assert.deepEqual(config, {
      mode: 'redirect',
      redirectTarget: '/redirect-assets/monkeys/middlefinger_monkey.jpg',
      redirectTargetKind: 'file',
    });
  });
});

test('selects the first matching image when multiple image names match', async () => {
  await withPublicDir(async (publicDir) => {
    await fs.mkdir(path.join(publicDir, 'redirect-assets', 'apes'), { recursive: true });
    await fs.writeFile(path.join(publicDir, 'redirect-assets', 'apes', 'aaa_monkey.png'), 'image');
    await fs.writeFile(path.join(publicDir, 'redirect-assets', 'apes', 'zzz_monkey.png'), 'image');

    const config = await resolveDeployConfig({
      redirectTargetInput: 'monkey',
      publicDir,
    });

    assert.deepEqual(config, {
      mode: 'redirect',
      redirectTarget: '/redirect-assets/apes/aaa_monkey.png',
      redirectTargetKind: 'file',
    });
  });
});

test('ignores non-image files when searching by text', async () => {
  await withPublicDir(async (publicDir) => {
    await fs.writeFile(path.join(publicDir, 'redirect-assets', 'monkeys', 'monkey.txt'), 'not-an-image');

    const config = await resolveDeployConfig({
      redirectTargetInput: 'monkey',
      publicDir,
    });

    assert.deepEqual(config, {
      mode: 'redirect',
      redirectTarget: '/redirect-assets/monkeys/middlefinger_monkey.jpg',
      redirectTargetKind: 'file',
    });
  });
});

test('rejects search text that matches no image files', async () => {
  await withPublicDir(async (publicDir) => {
    await assert.rejects(
      resolveDeployConfig({
        redirectTargetInput: '%banana%',
        publicDir,
      }),
      /no image file/i,
    );
  });
});
