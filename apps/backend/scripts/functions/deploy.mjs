import { Client, Functions, AppwriteException } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  FUNCTIONS,
  RUNTIME,
  ENTRYPOINT,
  COMMANDS,
  TIMEOUT,
  REQUIRED_VARS,
  VAR_DEFAULTS,
} from './config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, '../..');
const envFile = path.join(backendDir, '.env');

// process.env (injected by CI) wins; missing values fall back to apps/backend/.env.
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });

// Code deploys are owned by Appwrite's Git integration; this script only
// (re)creates config + syncs variables. Set APPWRITE_PUSH_CODE=1 to also push
// the locally built bundle (e.g. before Git is connected).
const pushCode = process.env.APPWRITE_PUSH_CODE === '1';

if (pushCode) {
  await import('./build.mjs');
}

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!endpoint || !projectId || !apiKey) {
  fail(
    'APPWRITE_ENDPOINT / APPWRITE_PROJECT / APPWRITE_API_KEY are required (via env or apps/backend/.env).',
  );
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const functions = new Functions(client);

async function ensureFunction(fn) {
  try {
    const existing = await functions.get(fn.id);
    console.log(`ℹ️  Function "${fn.id}" exists — updating config (schedule: "${fn.schedule}").`);
    return functions.update(
      fn.id,
      fn.name,
      RUNTIME,
      [],
      [],
      fn.schedule,
      TIMEOUT,
      true,
      true,
      ENTRYPOINT,
      COMMANDS,
    );
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) {
      fail(`Failed to look up function "${fn.id}": ${error.message}`);
    }
    console.log(`📦 Creating function "${fn.id}" (schedule: "${fn.schedule}").`);
    return functions.create(
      fn.id,
      fn.name,
      RUNTIME,
      [],
      [],
      fn.schedule,
      TIMEOUT,
      true,
      true,
      ENTRYPOINT,
      COMMANDS,
    );
  }
}

function buildTarball(fnDir) {
  if (!fs.existsSync(path.join(fnDir, ENTRYPOINT))) {
    fail(`Bundle not found for ${fnDir}. Run "npm run functions:build" first.`);
  }

  const tgz = path.join(os.tmpdir(), `gamingzone-${path.basename(fnDir)}.tar.gz`);
  if (fs.existsSync(tgz)) fs.rmSync(tgz);

  // Ship only what the Appwrite runtime needs: package.json (for npm install)
  // + the pre-built bundle. src/ is compiled in already.
  const result = spawnSync('tar', ['-czf', tgz, '-C', fnDir, 'package.json', 'dist'], {
    stdio: 'inherit',
  });

  if (result.status !== 0) fail('Failed to pack the function folder into a tarball.');
  console.log(`🗜️ Packed ${path.basename(fnDir)} → ${tgz}`);
  return tgz;
}

async function deployCode(functionId, fnDir) {
  const tgz = buildTarball(fnDir);
  const code = fs.readFileSync(tgz);
  const deployment = await functions.createDeployment(
    functionId,
    code,
    true, // activate immediately
    ENTRYPOINT,
    COMMANDS,
  );
  console.log(`🚀 Deployment ${deployment.$id} created and activated (entrypoint ${ENTRYPOINT}).`);
}

async function syncVariables(functionId) {
  let existing;
  try {
    existing = await functions.listVariables(functionId);
  } catch {
    existing = { variables: [] };
  }
  const byKey = new Map(existing.variables.map((v) => [v.key, v]));
  let synced = 0;

  for (const key of REQUIRED_VARS) {
    const value = process.env[key] ?? VAR_DEFAULTS[key] ?? '';
    if (!value) {
      console.warn(`⚠️  Skipping variable "${key}": no value in env/.env and no default.`);
      continue;
    }

    const current = byKey.get(key);
    try {
      if (current) {
        if (current.value === value) {
          continue;
        }
        await functions.updateVariable(functionId, current.$id, key, value);
      } else {
        await functions.createVariable(functionId, key, value);
      }
      synced += 1;
    } catch (error) {
      console.error(`❌ Failed to sync variable "${key}" on ${functionId}: ${error.message}`);
    }
  }

  return synced;
}

// Code deploys are owned by Appwrite's Git-integration (Function → Git, root
// folder = apps/backend/functions/<id>, branch main). This script only
// (re)creates the function config + syncs variables. Set APPWRITE_PUSH_CODE=1
// (above) to also push the local bundle.

console.log('\n── Deploying functions ──\n');

for (const fn of FUNCTIONS) {
  const fnDir = path.resolve(here, '../../functions', fn.dir);
  console.log(`▶  ${fn.id}${fn.schedule ? ` (Appwrite schedule "${fn.schedule}")` : ' (no schedule — GH Actions)'}`);

  await ensureFunction(fn);
  if (pushCode) {
    await deployCode(fn.id, fnDir);
  }
  const synced = await syncVariables(fn.id);

  console.log(`🔑 ${synced} variable(s) synced on ${fn.id}.`);
  if (pushCode) {
    console.log('   (code pushed from this machine via APPWRITE_PUSH_CODE=1)');
  } else {
    console.log('   code deploys come from Appwrite Git integration (branch main).');
  }
  console.log('');
}

console.log('✔ All functions configured and variables synced.');
console.log('  cron schedules internally: rss (every hour) · free-games (hourly) · weekly-summary (Fri 12:00 UTC)');