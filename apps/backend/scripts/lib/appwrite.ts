import { Client, Databases } from 'node-appwrite';
import { env } from './config';

function createAppwriteDatabases(): Databases {
  const endpoint = env.APPWRITE_ENDPOINT;
  const project = env.APPWRITE_PROJECT;
  const key = env.APPWRITE_API_KEY;

  const client = new Client();
  client.setEndpoint(endpoint).setProject(project).setKey(key);

  return new Databases(client);
}

export { createAppwriteDatabases };
