const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('assets');
const linkPath = path.resolve('web/public/assets');

try {
  fs.rmSync(linkPath, { recursive: true, force: true });
  console.log('Removed old assets');
} catch (e) {
  console.log('Error removing: ', e.message);
}

try {
  fs.symlinkSync(targetPath, linkPath, 'junction');
  console.log('Junction created successfully!');
} catch (e) {
  console.log('Error creating junction: ', e.message);
}
