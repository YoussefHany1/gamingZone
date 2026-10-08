// Build entrypoint used by the function's package.json "build" script.
//
// Appwrite's Git-connected deploy does NOT run this — it only does `npm
// install` and activates the committed dist/main.js, because the build
// container gets just the function root folder (scripts/_shared aren't copied
// in) and npm blocks esbuild's install script there. This script exists to
// regenerate that bundle locally, from the full repo.
//
// Runs with cwd = the function root: resolves esbuild via createRequire so it
// finds apps/backend/node_modules/esbuild during local use.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

import esbuildOptions from './esbuild.config.mjs';
import { ENTRYPOINT } from './config.mjs';

const cwd = process.cwd();
const require = createRequire(path.join(cwd, 'package.json'));
const { build } = require('esbuild');

const outfile = path.join(cwd, ENTRYPOINT);
fs.mkdirSync(path.dirname(outfile), { recursive: true });

await build({
  entryPoints: [path.join(cwd, 'src', 'main.ts')],
  outfile,
  ...esbuildOptions,
});

console.log(`✓ Built ${outfile}`);