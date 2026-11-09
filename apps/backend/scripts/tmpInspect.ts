import { Query } from 'node-appwrite';
import { createAppwriteDatabases } from './lib/appwrite';
import { env } from './lib/config';

const databases = createAppwriteDatabases();

async function main() {
  const res = await databases.listDocuments(env.APPWRITE_DATABASE_ID, env.RSS_COLLECTION_ID, [Query.limit(1000)]);
  const counts = new Map<string, { total: number; active: number }>();
  for (const doc of res.documents as any[]) {
    const lang = doc['language'] ?? '(missing)';
    const entry = counts.get(lang) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (doc['isActive'] !== false && String(doc['isActive']) !== 'false') entry.active += 1;
    counts.set(lang, entry);
  }
  for (const [lang, { total, active }] of Array.from(counts.entries()).sort()) {
    console.log(`${lang}: total=${total} active=${active}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
