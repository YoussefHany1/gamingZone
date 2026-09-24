'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// In this npm-workspaces monorepo, installed packages are split across two
// node_modules trees: some are hoisted to the repo root, while others (e.g. due
// to version overrides) are nested under apps/mobile. patch-package only
// resolves packages from the node_modules of the directory it runs in, and its
// --patch-dir must be a path relative to that directory. So run it once per
// node_modules against a filtered patch dir (kept on the same drive so the
// relative path resolves) containing only patches for packages present there.

const appDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(appDir, '../..');
const patchDir = path.join(appDir, 'patches');

const patchFiles = fs.existsSync(patchDir)
  ? fs.readdirSync(patchDir).filter((file) => file.endsWith('.patch'))
  : [];

if (patchFiles.length === 0) {
  return;
}

for (const dir of [appDir, rootDir]) {
  const present = patchFiles.filter((file) => {
    const pkg = file.split('+')[0];
    return fs.existsSync(path.join(dir, 'node_modules', pkg));
  });

  if (present.length === 0) {
    continue;
  }

  const tmpPatchDir = fs.mkdtempSync(path.join(appDir, '.patch-package-tmp-'));
  try {
    for (const file of present) {
      fs.copyFileSync(path.join(patchDir, file), path.join(tmpPatchDir, file));
    }

    const relativePatchDir = path.relative(dir, tmpPatchDir).replace(/\\/g, '/');

    execSync(
      `patch-package --patch-dir "${relativePatchDir}" --error-on-fail`,
      { cwd: dir, stdio: 'inherit' }
    );
  } catch (error) {
    throw new Error(
      `Failed to apply patches for ${present.join(', ')} in ${dir}`,
      { cause: error }
    );
  } finally {
    fs.rmSync(tmpPatchDir, { recursive: true, force: true });
  }
}