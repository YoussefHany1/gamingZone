import * as path from 'path';
import * as dotenv from 'dotenv';

let loaded = false;

function loadBackendEnv() {
  if (loaded) return;

  const envPath = path.resolve(__dirname, '..', '..', '.env');
  dotenv.config({ path: envPath });
  loaded = true;
}

export { loadBackendEnv };
