import { logger } from '../../lib/logger';
import * as sdk from 'node-appwrite';

import { loadBackendEnv } from '../../lib/env';
import { env, getAiProviderConfig } from '../../lib/config';
import { createAppwriteDatabases } from '../../lib/appwrite';
import { initFirebaseAdmin } from '../../lib/firebaseAdmin';
import { getErrorMessage } from '../../lib/errors';
import { createAiRuntime } from '../../lib/ai';
import type { AiRuntime } from '../../lib/ai';
import { formatAiChain, resolveAiModels } from '../../lib/ai.shared';
import { ANDROID_CHANNEL_ID, buildTopicPush, FCM_TOPIC, sendTopicPush } from '../../lib/fcm';

loadBackendEnv();

const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const NEWS_COLLECTION_ID = env.ARTICLES_COLLECTION_ID;
const SUMMARIES_COLLECTION_ID = env.SUMMARIES_COLLECTION_ID;

const databases = createAppwriteDatabases();
const firebaseState = initFirebaseAdmin('summary');

if (firebaseState.enabled) {
  logger.info('✅ Firebase Admin initialized.');
} else if (firebaseState.error) {
  logger.warn(`⚠️ Firebase error: ${firebaseState.error}`);
}

interface SummaryResponse {
  arabic: string;
  english: string;
  spanish: string;
  french: string;
  hindi: string;
  /** Brazilian Portuguese. Underscore keeps the key hyphen-free for the Gemini schema. */
  portuguese_br: string;
  /** European Portuguese. */
  portuguese_pt: string;
}

/** All seven languages the weekly recap is produced in (mirrors the app's UI locales). */
const SUMMARY_LANGUAGE_KEYS = ['arabic', 'english', 'spanish', 'french', 'hindi', 'portuguese_br', 'portuguese_pt'] as const;

const LANGUAGE_LABELS: Record<(typeof SUMMARY_LANGUAGE_KEYS)[number], string> = {
  arabic: 'Arabic',
  english: 'English',
  spanish: 'Spanish',
  french: 'French',
  hindi: 'Hindi',
  portuguese_br: 'Brazilian Portuguese',
  portuguese_pt: 'European Portuguese',
};

/** `SummaryResponse` key → `weekly_summaries` attribute, mirroring the `summary_*` naming on `articles`. */
const SUMMARY_ATTRIBUTES: Record<(typeof SUMMARY_LANGUAGE_KEYS)[number], string> = {
  arabic: 'summary_ar',
  english: 'summary_en',
  spanish: 'summary_es',
  french: 'summary_fr',
  hindi: 'summary_hi',
  portuguese_br: 'summary_pt_br',
  portuguese_pt: 'summary_pt_pt',
};

const SUMMARY_PROMPT = (
  startDate: string,
  endDate: string,
  newsText: string,
) => `You are a senior gaming news editor writing a weekly recap for a gaming audience.

TASK: Synthesize the gaming news articles below into a cohesive Weekly Recap. Output SEVEN language versions: Arabic, English, Spanish, French, Hindi, Brazilian Portuguese and European Portuguese.

CONTEXT: This recap covers ${startDate} to ${endDate}.

GUIDELINES:
1. **Tone**: Write like an informed gaming journalist — authoritative but approachable. Assume the reader is a gamer who wants to stay current without reading every article.
2. **Structure**:
   - Start directly with the first thematic section — do NOT add a title, header, or greeting.
   - Group stories into thematic sections with ### headings. Choose headings that best fit the week's news, for example:
     - "### 🕹️ Major Releases & Updates" — new games, patches, DLC, season launches
     - "### 🏆 Esports & Competitive" — tournaments, roster changes, competitive scene news
     - "### 💰 Business & Industry" — acquisitions, layoffs, financials, studio news
     - "### 📰 Quick Hits" — smaller stories that don't warrant their own section
     - "### 🔮 Looking Ahead" — upcoming releases, events, or things to watch
   - You are not limited to these — invent sections that match the actual content.
3. **Content**: Synthesize articles into 2-4 sentences per section. Do NOT repeat headlines verbatim — connect related stories, add context, and explain why they matter. Use the article descriptions to add specific details (game names, studio names, numbers).
4. **Formatting**: Use Markdown bullet points ONLY for lists of 3+ small standalone items (e.g. multiple game releases on the same day). Prefer flowing prose. Separate sections with a blank line.
5. **Emojis**: Use emojis in section headings only. Keep body text clean.
6. **Languages**: Every version must follow the EXACT same structure — same section headings (translated), same emoji usage, same number of sections.
   - Arabic: clear Modern Standard Arabic (فصحى), not dialectal.
   - Hindi: clear Standard Hindi, written in Devanagari script.
   - Portuguese: Brazilian (portuguese_br) and European (portuguese_pt) must be distinct, natural variants of each — not copies of one another.
7. **Length**: Each language version must be between ~1,800 and ~2,500 characters. Be dense, not verbose — every sentence should add value. Do NOT exceed ~2,500 characters per language.

OUTPUT: A JSON object with the string keys "arabic", "english", "spanish", "french", "hindi", "portuguese_br" and "portuguese_pt", each containing the full Markdown-formatted recap in that language. Never leave a key empty.

Headlines & Descriptions:
${newsText}`;

const PARTIAL_SUMMARY_PROMPT = (
  batchIndex: number,
  totalBatches: number,
  newsText: string,
) => `You are a senior gaming news editor writing a segment of a weekly gaming recap.

TASK: Summarize this batch (batch ${batchIndex} of ${totalBatches}) into a dense, well-structured segment that will later be merged with other segments into one cohesive weekly recap.

GUIDELINES:
1. **Tone**: Authoritative but approachable — like an informed gaming journalist.
2. **Structure**: Start each thematic group with a ### heading. Use section names that fit the content (e.g. "### 🕹️ Major Releases", "### 💰 Industry News"). Keep sections tight — 1-2 sentences each.
3. **Content**: Synthesize articles — do NOT repeat headlines. Connect related stories and use the article descriptions to add specific details. Prioritize major stories; briefly mention smaller ones.
4. **Formatting**: Markdown bullet points only for 3+ small items. Blank line between sections. Emojis in headings only.
5. **Languages**: Produce ALL seven versions — Arabic, English, Spanish, French, Hindi, Brazilian Portuguese, European Portuguese — with the same structure, same sections (translated) and same emoji usage. Arabic in clear Modern Standard Arabic (فصحى); the two Portuguese variants distinct and natural.
6. **Conciseness**: This is a chunk — keep it compact so multiple chunks can be merged cleanly. Aim for ~600–1,200 characters per language version.

OUTPUT: A JSON object with the string keys "arabic", "english", "spanish", "french", "hindi", "portuguese_br" and "portuguese_pt", each containing the Markdown-formatted segment. Never leave a key empty.

Headlines & Descriptions:
${newsText}`;

const MERGE_SUMMARY_PROMPT = (
  startDate: string,
  endDate: string,
  segmentsText: string,
) => `You are a senior gaming news editor producing the final version of a weekly gaming recap.

TASK: Merge the following segment recaps into ONE consolidated, polished Weekly Recap. Output SEVEN language versions: Arabic, English, Spanish, French, Hindi, Brazilian Portuguese and European Portuguese.

CONTEXT: This recap covers ${startDate} to ${endDate}.

SEGMENTS TO MERGE:
Each block below is the same recap segment rendered in all seven languages, from a different batch of articles. For every language, merge ONLY that language's version of the segments into one cohesive recap.

${segmentsText}

GUIDELINES:
1. **Tone**: Authoritative, approachable gaming journalism. Write for a gamer who wants the week's highlights.
2. **Structure**:
   - Start directly with the first thematic section — do NOT add a title, header, or greeting.
   - Consolidate all content into logical thematic sections with ### headings. Merge overlapping topics from different segments into single sections.
   - Recommended sections (adapt to content):
     - "### 🕹️ Major Releases & Updates"
     - "### 🏆 Esports & Competitive"
     - "### 💰 Business & Industry"
     - "### 📰 Quick Hits" — for 3+ smaller stories grouped as bullet points
     - "### 🔮 Looking Ahead"
3. **Content**: Write 2-4 flowing sentences per section. Do NOT simply concatenate segments — rewrite into a unified narrative. Deduplicate stories that appear in multiple segments. Use specific details (game names, studio names, numbers) from the source material.
4. **Formatting**: Bullet points only for lists of 3+ small items. Blank line between sections. Emojis in headings only.
5. **Languages**: EXACT same structure across all seven versions — same sections (translated), same emoji usage, same flow. Arabic in clear Modern Standard Arabic (فصحى); Hindi in Standard Hindi (Devanagari); Brazilian (portuguese_br) and European (portuguese_pt) Portuguese distinct and natural.
6. **Length**: Each language version must be between ~1,800 and ~2,500 characters (hard limit: 5,000 bytes). Be dense and decisive — avoid redundant phrasing.

OUTPUT: A JSON object with the string keys "arabic", "english", "spanish", "french", "hindi", "portuguese_br" and "portuguese_pt", each containing the full polished Markdown recap in that language. Never leave a key empty.`;

function parseJsonSummary(rawText: string): SummaryResponse {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error('Failed to parse AI JSON: ' + rawText.substring(0, 50), { cause: error });
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const WEEKLY_GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    arabic: { type: 'STRING' },
    english: { type: 'STRING' },
    spanish: { type: 'STRING' },
    french: { type: 'STRING' },
    hindi: { type: 'STRING' },
    portuguese_br: { type: 'STRING' },
    portuguese_pt: { type: 'STRING' },
  },
  required: ['arabic', 'english', 'spanish', 'french', 'hindi', 'portuguese_br', 'portuguese_pt'],
};

/**
 * Generates the Arabic/English recap JSON via the model fallback chain
 * (`gemini-2.5-flash` → `gemini-3.1-flash-lite` → Groq — see `lib/ai`). Each
 * model retries internally; throws only when every configured model fails.
 *
 * `ai` is the run-scoped runtime created once in `runGenerateWeeklySummary` so
 * a model that failed over on quota is skipped for every later chunk/merge
 * call in the same run.
 */
async function callAiWithRetry(
  prompt: string,
  ai: AiRuntime,
  maxRetries = 3,
): Promise<SummaryResponse> {
  const { provider, model, text } = await ai.generate({
    prompt,
    label: 'weekly summary',
    geminiSchema: WEEKLY_GEMINI_SCHEMA,
    retries: maxRetries,
    // The weekly prompt is large (up to ~250 articles), so allow more time
    // than the per-article default.
    timeoutMs: 60_000,
  });

  logger.info(`✅ Weekly summary generated via ${provider}/${model}.`);
  return parseJsonSummary(text);
}

async function summarizeWithAi(
  newsText: string,
  ai: AiRuntime,
  opts: {
    isPartial: boolean;
    startDate?: string;
    endDate?: string;
    batchIndex?: number;
    totalBatches?: number;
  } = {
    isPartial: false,
  },
): Promise<SummaryResponse> {
  const prompt = opts.isPartial
    ? PARTIAL_SUMMARY_PROMPT(opts.batchIndex ?? 1, opts.totalBatches ?? 1, newsText)
    : SUMMARY_PROMPT(opts.startDate ?? '', opts.endDate ?? '', newsText);
  return callAiWithRetry(prompt, ai);
}

function formatSegment(summary: SummaryResponse, batchIndex: number): string {
  const lines = (Object.keys(LANGUAGE_LABELS) as (keyof SummaryResponse)[]).map(
    (key) => `${LANGUAGE_LABELS[key]}: ${summary[key] ?? ''}`,
  );
  return `[Batch ${batchIndex}]\n${lines.join('\n\n')}`;
}

function mergeSummariesWithAi(
  startDate: string,
  endDate: string,
  segments: SummaryResponse[],
  ai: AiRuntime,
): Promise<SummaryResponse> {
  const segmentsText = segments.map((s, idx) => formatSegment(s, idx + 1)).join('\n\n');
  return callAiWithRetry(MERGE_SUMMARY_PROMPT(startDate, endDate, segmentsText), ai);
}

function getSevenDaysAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
}

async function fetchLastWeekNewsTitles() {
  const sevenDaysAgo = getSevenDaysAgoIso();
  const allDocuments: sdk.Models.Document[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(DATABASE_ID, NEWS_COLLECTION_ID as string, [
      sdk.Query.greaterThan('pubDate', sevenDaysAgo),
      sdk.Query.limit(limit),
      sdk.Query.offset(offset),
    ]);

    allDocuments.push(...response.documents);

    if (response.documents.length < limit) {
      break;
    }
    offset += limit;
  }

  return {
    sevenDaysAgo,
    documents: allDocuments,
  };
}

const MAX_SUMMARY_BYTES = 5000;

/** Removes a leading "# ..."/"## ..." title that some models still emit despite the prompt (sections are ###). */
function stripLeadingTitle(text: string): string {
  return text.replace(/^#{1,2}[^\n]*\n+/, '').trim();
}

function truncateByBytes(text: string, maxBytes: number): string {
  const trimmed = text.trim();
  if (Buffer.byteLength(trimmed, 'utf8') <= maxBytes) {
    return trimmed;
  }

  const endIndex = trimmed.lastIndexOf('\n\n', maxBytes);
  if (endIndex > 0 && Buffer.byteLength(trimmed.slice(0, endIndex), 'utf8') <= maxBytes) {
    return trimmed.slice(0, endIndex).trim();
  }

  let result = '';
  for (const character of Array.from(trimmed)) {
    if (Buffer.byteLength(result + character, 'utf8') > maxBytes) {
      break;
    }
    result += character;
  }
  return result.trim();
}

async function saveWeeklySummary(summary: SummaryResponse, startDate: string) {
  const data: Record<string, string> = {};
  for (const key of SUMMARY_LANGUAGE_KEYS) {
    const attribute = SUMMARY_ATTRIBUTES[key];
    const value = stripLeadingTitle(summary[key] ?? '');
    const truncated = truncateByBytes(value, MAX_SUMMARY_BYTES);
    if (truncated !== value) {
      logger.warn(
        `⚠️ ${attribute} exceeded ${MAX_SUMMARY_BYTES} bytes – truncated to ${truncated.length} characters.`,
      );
    }
    data[attribute] = truncated;
  }

  await databases.createDocument(DATABASE_ID, SUMMARIES_COLLECTION_ID, sdk.ID.unique(), {
    ...data,
    startDate,
    endDate: new Date().toISOString(),
  });
}

/**
 * Broadcasts a topic push on the app's news channel so subscribed users are
 * alerted (even when the app is closed) that a fresh recap is available.
 *
 * Best-effort like the RSS/free-games pushes: a failure is logged, never
 * thrown, so a lost push can't fail the whole weekly job.
 */
async function sendSummaryNotification(): Promise<void> {
  const message = buildTopicPush({
    topic: FCM_TOPIC.WEEKLY_SUMMARY,
    title: '🎮 Weekly Gaming Recap',
    body: 'Your weekly recap is ready. Tap to read it!',
    channelId: ANDROID_CHANNEL_ID.NEWS,
    data: {
      type: 'weekly_summary',
    },
  });

  const { ok, error } = await sendTopicPush(firebaseState, message);
  if (ok) {
    logger.info('🔔 Weekly summary notification sent.');
  } else if (error) {
    logger.error(`❌ Weekly summary notification failed: ${getErrorMessage(error)}`);
  }
}

async function runGenerateWeeklySummary() {
  try {
    // One runtime per run: every chunk + merge call below shares the memory of
    // quota-exhausted models, so a dead primary is skipped after the first call.
    const providerConfig = getAiProviderConfig();
    const ai = createAiRuntime(providerConfig, { log: logger });
    logger.info(`📰 Weekly summary — chain: ${formatAiChain(resolveAiModels({}, providerConfig))}`);
    logger.info('Fetching news from the last 7 days...');

    const { sevenDaysAgo, documents } = await fetchLastWeekNewsTitles();
    if (!documents.length) {
      logger.info('No news found to summarize.');
      return;
    }

    logger.info(`Found ${documents.length} articles. Preparing to process...`);

    const endDate = new Date().toISOString();
    const CHUNK_SIZE = 250;
    let jsonSummary = null;

    const formatDoc = (doc: sdk.Models.Document) => {
      const fields = doc as { description?: string; title?: string };
      const desc = fields.description
        ? fields.description.substring(0, 150).replace(/\n/g, ' ') + '...'
        : '';
      return `- ${fields.title}\n  ${desc}`;
    };

    if (documents.length <= CHUNK_SIZE) {
      const newsText = documents.map(formatDoc).join('\n');
      logger.info(`Sending all ${documents.length} articles in a single batch to AI...`);
      jsonSummary = await summarizeWithAi(newsText, ai, {
        isPartial: false,
        startDate: sevenDaysAgo,
        endDate,
      });
      logger.info('✅ Weekly recap generated.');
    } else {
      const chunks = [];
      for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
        chunks.push(documents.slice(i, i + CHUNK_SIZE));
      }

      logger.info(`Split ${documents.length} articles into ${chunks.length} chunks.`);

      const chunkSummaries: SummaryResponse[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkText = chunk.map(formatDoc).join('\n');
        logger.info(`Processing chunk ${i + 1}/${chunks.length} (size: ${chunk.length})...`);

        const summary = await summarizeWithAi(chunkText, ai, {
          isPartial: true,
          batchIndex: i + 1,
          totalBatches: chunks.length,
        });
        chunkSummaries.push(summary);

        if (i < chunks.length - 1) {
          logger.info('Waiting 2 seconds before next chunk to avoid rate limits...');
          await delay(2000);
        }
      }

      logger.info('Consolidating and merging all chunk summaries...');

      jsonSummary = await mergeSummariesWithAi(
        sevenDaysAgo,
        endDate,
        chunkSummaries,
        ai,
      );
      logger.info('✅ Weekly recap merged.');
    }

    logger.info('Summary generated successfully. Saving to Appwrite...');
    await saveWeeklySummary(jsonSummary, sevenDaysAgo);
    logger.info('✅ Weekly summary saved!');
    await sendSummaryNotification();
  } catch (error: unknown) {
    logger.error('❌ Error generating summary:', getErrorMessage(error));
    if (error instanceof SyntaxError) {
      logger.info('JSON Parse Error – check the raw AI response.');
    }

    throw error;
  }
}

export { runGenerateWeeklySummary };
