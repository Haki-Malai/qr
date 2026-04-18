export type DeployConfig =
  | { version: 1; mode: 'quotes' }
  | {
      version: 2;
      mode: 'redirect';
      redirectTarget: string;
      redirectTargetKind: 'url' | 'file';
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const valueKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();

  return (
    valueKeys.length === expectedKeys.length &&
    valueKeys.every((key, index) => key === expectedKeys[index])
  );
}

export function parseDeployConfig(value: unknown): DeployConfig | null {
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

export async function loadDeployConfig(): Promise<DeployConfig> {
  const configUrl = `${import.meta.env.BASE_URL}deploy-config.json`;
  const response = await fetch(configUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load deploy config (${response.status}).`);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error('Deploy config is not valid JSON.');
  }

  const config = parseDeployConfig(payload);

  if (!config) {
    throw new Error('Deploy config is invalid.');
  }

  return config;
}
