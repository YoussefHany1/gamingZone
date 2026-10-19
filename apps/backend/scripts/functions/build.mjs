// Local bundler: produces the dist/main.js that gets committed. Appwrite's
// Git-connected deploy skips building (it just runs `npm install`); this keeps
// a faithful, reproducible local build for smoke tests and for updates.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

import { FUNCTIONS, ENTRYPOINT } from './config.mjs';
import esbuildOptions from './esbuild.config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const functionsRoot = path.resolve(here, '../../functions');

for (const fn of FUNCTIONS) {
  const fnDir = path.join(functionsRoot, fn.dir);
  const outfile = path.join(fnDir, ENTRYPOINT);

  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  await build({
    entryPoints: [path.join(fnDir, 'src', 'main.ts')],
    outfile,
    ...esbuildOptions,
  });

  console.log(`✓ Built ${path.relative(process.cwd(), outfile)}`);

  // main.ts spawns worker.js as a child process with its own heap cap, so it is
  // a second entry point in the same dist folder rather than a separate build.
  const workerOut = path.join(path.dirname(outfile), 'worker.js');
  await build({
    entryPoints: [path.join(fnDir, 'src', 'worker.ts')],
    outfile: workerOut,
    ...esbuildOptions,
  });

  console.log(`✓ Built ${path.relative(process.cwd(), workerOut)}`);
}
