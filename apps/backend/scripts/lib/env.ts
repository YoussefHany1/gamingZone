import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

let loaded = false;

/**
 * Resolves an explicit env file from argv (`--app-env <path>` or
 * `--app-env=<path>`) or the `ENV_FILE` env var. Returns `null` when neither is
 * given so the default `apps/backend/.env` is used.
 *
 * Deliberately NOT `--env-file`: Node.js reserves that flag for its own
 * dotenv loading, so it would be consumed before the script ever sees it
 * (and abort on a missing file with `node.exe: <file>: not found`).
 *
 * Pure (argv in → path out) so the precedence — and, more importantly, that a
 * staging file is never silently ignored — can be unit tested without touching
 * the filesystem or process env.
 */
export function resolveEnvFileArg(argv: string[], envFileEnv?: string): string | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--app-env') {
      const next = argv[i + 1];
      return next && next.trim() ? next.trim() : null;
    }
    if (arg.startsWith('--app-env=')) {
      const value = arg.slice('--app-env='.length).trim();
      return value || null;
    }
  }

  return envFileEnv && envFileEnv.trim() ? envFileEnv.trim() : null;
}

function loadBackendEnv() {
  if (loaded) return;

  const override = resolveEnvFileArg(process.argv.slice(2), process.env.ENV_FILE);

  if (override) {
    const envPath = path.resolve(process.cwd(), override);
    if (!fs.existsSync(envPath)) {
      throw new Error(`Env file not found: ${envPath}`);
    }
    // An explicit env file wins over anything already in process.env, so
    // pointing a script at staging can never silently fall back to production
    // values that happen to be exported in the shell.
    dotenv.config({ path: envPath, override: true });
  } else {
    dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
  }

  loaded = true;
}

export { loadBackendEnv };
