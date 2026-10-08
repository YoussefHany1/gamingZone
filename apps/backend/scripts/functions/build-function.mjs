// Build entrypoint used by each function's package.json "build" script.
//
// Appwrite's Git-connected build runs `npm install && npm run build` with cwd
// set to the function root (apps/backend/functions/<id>). npm installs
// esbuild into that root's node_modules, so resolve it from there — never
// from here (scripts/functions is outside the packaged root).
//
// Locally this also walks up to apps/<backend>/node_modules/esbuild, so it
// doubles as a faithful local reproduction of the Appwrite Git build.
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