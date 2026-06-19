const { Client, Databases } = require("node-appwrite");

function requireEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createAppwriteDatabases() {
  const endpoint = requireEnvVar("APPWRITE_ENDPOINT");
  const project = requireEnvVar("APPWRITE_PROJECT");
  const key = requireEnvVar("APPWRITE_API_KEY");

  const client = new Client();
  client.setEndpoint(endpoint).setProject(project).setKey(key);

  return new Databases(client);
}

module.exports = {
  createAppwriteDatabases,
  requireEnvVar,
};
