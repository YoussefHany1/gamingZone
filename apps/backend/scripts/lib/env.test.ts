import { describe, it, expect } from 'vitest';

import { resolveEnvFileArg } from './env';

describe('resolveEnvFileArg', () => {
  it('returns null when nothing points at an explicit env file', () => {
    expect(resolveEnvFileArg([])).toBeNull();
    expect(resolveEnvFileArg(['--dry-run'])).toBeNull();
  });

  it('reads a space-separated --app-env argument', () => {
    expect(resolveEnvFileArg(['--app-env', '.env.staging'])).toBe('.env.staging');
  });

  it('reads an equals-separated --app-env argument', () => {
    expect(resolveEnvFileArg(['--limit=5', '--app-env=.env.staging'])).toBe('.env.staging');
  });

  it('falls back to the ENV_FILE variable when no flag is present', () => {
    expect(resolveEnvFileArg([], '.env.staging')).toBe('.env.staging');
  });

  it('prefers the CLI flag over ENV_FILE', () => {
    expect(resolveEnvFileArg(['--app-env', '.env.staging'], '.env.other')).toBe('.env.staging');
  });

  it('ignores empty / whitespace-only values', () => {
    expect(resolveEnvFileArg(['--app-env', ''])).toBeNull();
    expect(resolveEnvFileArg(['--app-env=   '])).toBeNull();
    expect(resolveEnvFileArg([], '   ')).toBeNull();
  });
});
