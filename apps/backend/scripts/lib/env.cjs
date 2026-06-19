const path = require("path");
const dotenv = require("dotenv");

let loaded = false;

function loadBackendEnv() {
  if (loaded) return;

  const envPath = path.resolve(__dirname, "..", "..", ".env");
  dotenv.config({ path: envPath });
  loaded = true;
}

module.exports = {
  loadBackendEnv,
};
