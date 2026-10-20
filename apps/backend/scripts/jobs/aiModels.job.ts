import { logger } from '../lib/logger';
import { loadBackendEnv } from '../lib/env';
import { getGeminiKey } from '../lib/config';
import { GEMINI_BASE_URL } from '../lib/ai.shared';

// Read-only inspector: lists the Gemini models the configured key can actually
// call for `generateContent`. Model availability is account-specific (Google
// restricts some models per key/project, and deprecated ids start 404-ing), so
// this is the sanity check before editing `AI_CHAIN` or after a model change.
//
// Usage:
//   npm run ai:models                                # apps/backend/.env
//   npm run ai:models -- --app-env .env.staging

loadBackendEnv();

interface GeminiModelInfo {
  name?: string;
  supportedGenerationMethods?: string[];
}

async function main(): Promise<void> {
  const key = getGeminiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not set.');

  logger.info('🤖 Listing Gemini models available to GEMINI_API_KEY...');
  const response = await fetch(`${GEMINI_BASE_URL}?key=${key}&pageSize=1000`);
  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      `Gemini models.list failed: HTTP ${response.status} ${JSON.stringify(data ?? null).slice(0, 300)}`,
    );
  }

  const models = (data as { models?: GeminiModelInfo[] } | undefined)?.models ?? [];
  const usable = models
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => (model.name ?? '').replace(/^models\//, ''))
    .filter(Boolean)
    .sort();

  if (usable.length === 0) {
    logger.warn('⚠️ No generateContent-capable models were returned for this key.');
    return;
  }

  for (const model of usable) logger.info(`   • ${model}`);
  logger.info(
    `\n✅ ${usable.length} model(s) usable for generateContent — use these ids in AI_CHAIN ` +
      '(bare id or "gemini/<id>"; Groq entries use "groq/<model>").',
  );
}

main()
  .then(() => setTimeout(() => process.exit(0), 250))
  .catch((error) => {
    logger.error(error, 'Fatal Error');
    setTimeout(() => process.exit(1), 250);
  });
