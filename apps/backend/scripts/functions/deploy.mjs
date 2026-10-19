import { Client, Functions, AppwriteException } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
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
  RETIRED_FUNCTIONS,
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

// `npm run functions:deploy -- --retired-only` only retires RETIRED_FUNCTIONS
// and leaves the live function's config/variables completely untouched (useful
// when you don't want to re-sync environment variables).
const retiredOnly = process.argv.includes('--retired-only');

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
  let current;
  try {
    current = await functions.get(fn.id);
    console.log(`ℹ️  Function "${fn.id}" exists — updating config.`);
    await functions.update(
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
    console.log(`📦 Creating function "${fn.id}".`);
    current = await functions.create(
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

  // The hourly cadence lives in `interval` (minutes), which the SDK cannot set.
  const scheduled = await setFunctionScheduling(fn.id, {
    interval: fn.interval,
    enabled: true,
  });
  console.log(
    `⏱  "${scheduled.name}" enabled with interval=${scheduled.interval} (minutes), schedule="${scheduled.schedule}".`,
  );
  return current;
}

/**
 * Write the two fields that actually drive executions on this server.
 *
 * - The cadence is `interval` (minutes — `60` = hourly); the legacy `schedule`
 *   cron string is empty here and is not what fires the runs.
 * - `enabled: false` alone does NOT stop scheduled executions (verified on
 *   production: a disabled function kept firing every hour), so it is written
 *   together with the interval.
 *
 * node-appwrite 21 does not expose `interval`, so this calls the REST API
 * directly. Every other field is read first and echoed back, because this
 * server's PUT resets anything the body omits (verified: retiring a function
 * wiped its `timeout` and `commands`). Git provider fields are not part of the
 * update schema and are left alone by Appwrite itself.
 */
async function setFunctionScheduling(fn, { enabled, interval }) {
  const current = await functions.get(fn);

  const response = await fetch(`${endpoint}/functions/${fn}`, {
    method: 'PUT',
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: current.name,
      execute: current.execute ?? [],
      events: current.events ?? [],
      // `schedule` and `interval` are mutually exclusive: "" + interval is how
      // this server expresses "run every N minutes".
      schedule: '',
      interval,
      enabled,
      timeout: current.timeout,
      entrypoint: current.entrypoint,
      commands: current.commands ?? '',
      logging: current.logging,
      runtime: current.runtime,
    }),
  });

  if (!response.ok) {
    fail(
      `Failed to update the scheduling of "${fn}": HTTP ${response.status} ${await response.text()}`,
    );
  }

  return response.json();
}

async function retireFunction(fn) {
  let existing;
  try {
    existing = await functions.get(fn.id);
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      console.log(`✔ "${fn.name}" (${fn.id}) does not exist — nothing to retire.`);
      return;
    }
    fail(`Failed to look up retired function "${fn.id}": ${error.message}`);
  }

  const retired = await setFunctionScheduling(fn.id, { interval: 0, enabled: false });

  console.log(
    `🧹 "${retired.name}" (${fn.id}) retired — interval=${retired.interval}, schedule="${retired.schedule}", enabled=${retired.enabled}.`,
  );
  console.log(
    '   Its deployments and variables are kept, so it can be restored from the console if needed.',
  );
  if (existing.providerRepositoryId) {
    console.log('   ⚠️  Still Git-connected — it keeps re-deploying on push until you delete it.');
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
  // Appwrite's SDK uploads a real `File` (see Client.chunkedUpload); a raw
  // Buffer is rejected with "File not found in payload".
  const code = InputFile.fromPath(tgz, 'code.tar.gz');
  const deployment = await functions.createDeployment(
    functionId,
    code,
    true, // activate immediately
    ENTRYPOINT,
    COMMANDS,
    (progress) => {
      console.log(`   ↑ upload ${progress.progress}% (${progress.sizeUploaded} bytes)`);
    },
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
// folder = apps/backend/functions/<dir>, branch main). This script only
// (re)creates the function config + syncs variables. Set APPWRITE_PUSH_CODE=1
// (above) to also push the local bundle.

console.log('\n── Deploying functions ──\n');

if (retiredOnly) {
  console.log('⏭  --retired-only: skipping the live function config + variable sync.\n');
}

for (const fn of retiredOnly ? [] : FUNCTIONS) {
  const fnDir = path.resolve(here, '../../functions', fn.dir);
  console.log(`▶  ${fn.id} "${fn.name}" — every ${fn.interval} min`);

  await ensureFunction(fn);
  const synced = await syncVariables(fn.id);
  console.log(`🔑 ${synced} variable(s) synced on ${fn.id}.`);

  // The code push must come last: changing variables or config after a
  // deployment flips the function's `live` flag to false ("redeploy to apply
  // the latest configuration"), so the final action has to be the deploy.
  if (pushCode) {
    await deployCode(fn.id, fnDir);
    console.log('   (code pushed from this machine via APPWRITE_PUSH_CODE=1)');
  } else {
    console.log('   code deploys come from Appwrite Git integration (branch main).');
    // Appwrite clears the function's `live` flag when its configuration
    // (variables, entrypoint, ...) changed after the active deployment was
    // built, so a config-only run can leave the console saying "not live" until
    // the next code push applies it. Executions keep running meanwhile.
  }
  console.log('');
}

if (RETIRED_FUNCTIONS.length > 0) {
  console.log('── Retiring duplicate functions ──\n');
  for (const fn of RETIRED_FUNCTIONS) {
    await retireFunction(fn);
  }
  console.log('');
}

console.log(
  retiredOnly
    ? '✔ Retired functions processed.'
    : '✔ All functions configured and variables synced.',
);
console.log(
  '  cron schedules internally: rss (every hour) · free-games (hourly) · weekly-summary (Fri 12:00 UTC)',
);
