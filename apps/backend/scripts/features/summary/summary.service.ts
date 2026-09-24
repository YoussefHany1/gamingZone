import { logger } from '../../lib/logger';
import * as sdk from 'node-appwrite';

import { loadBackendEnv } from '../../lib/env';
import { env } from '../../lib/config';
import { createAppwriteDatabases } from '../../lib/appwrite';

loadBackendEnv();

const GEMINI_API_KEY = env.GEMINI_API_KEY;
const DATABASE_ID = env.APPWRITE_DATABASE_ID;
const NEWS_COLLECTION_ID = env.ARTICLES_COLLECTION_ID;
const SUMMARIES_COLLECTION_ID = env.SUMMARIES_COLLECTION_ID;

const databases = createAppwriteDatabases();

interface SummaryResponse {
  arabic: string;
  english: string;
}

const SUMMARY_PROMPT = (
  startDate: string,
  endDate: string,
  newsText: string,
) => `You are a senior gaming news editor writing a weekly recap for a gaming audience.

TASK: Synthesize the gaming news articles below into a cohesive Weekly Recap. Output BOTH Arabic and English versions.

CONTEXT: This recap covers ${startDate} to ${endDate}.

GUIDELINES:
1. **Tone**: Write like an informed gaming journalist — authoritative but approachable. Assume the reader is a gamer who wants to stay current without reading every article.
2. **Structure**:
   - Open with a bold title: "## 🎮 Weekly Gaming Recap (${startDate} – ${endDate})"
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
6. **Arabic version**: Must follow the EXACT same structure — same section headings (translated), same emoji usage, same number of sections. Write in clear Modern Standard Arabic (فصحى), not dialectal.
7. **Length**: Each language version must be between ~1,800 and ~2,500 characters. Be dense, not verbose — every sentence should add value. Do NOT exceed ~2,500 characters per language.

OUTPUT: A JSON object with keys "arabic" and "english", each containing the full Markdown-formatted recap in that language.

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
5. **Arabic version**: Same structure, same sections (translated), same emoji usage. Write in clear Modern Standard Arabic (فصحى).
6. **Conciseness**: This is a chunk — keep it compact so multiple chunks can be merged cleanly. Aim for ~600–1,200 characters per language version.

OUTPUT: A JSON object with keys "arabic" and "english", each containing the Markdown-formatted segment.

Headlines & Descriptions:
${newsText}`;

const MERGE_SUMMARY_PROMPT = (
  startDate: string,
  endDate: string,
  arabicSummaries: string,
  englishSummaries: string,
) => `You are a senior gaming news editor producing the final version of a weekly gaming recap.

TASK: Merge the following segment recaps into ONE consolidated, polished Weekly Recap. Output BOTH Arabic and English.

CONTEXT: This recap covers ${startDate} to ${endDate}.

SEGMENTS TO MERGE:
Each segment covers a different batch of articles from the same week. There will be overlap — your job is to deduplicate and unify.

GUIDELINES:
1. **Tone**: Authoritative, approachable gaming journalism. Write for a gamer who wants the week's highlights.
2. **Structure**:
   - Open with a bold title: "## 🎮 Weekly Gaming Recap (${startDate} – ${endDate})"
   - Consolidate all content into logical thematic sections with ### headings. Merge overlapping topics from different segments into single sections.
   - Recommended sections (adapt to content):
     - "### 🕹️ Major Releases & Updates"
     - "### 🏆 Esports & Competitive"
     - "### 💰 Business & Industry"
     - "### 📰 Quick Hits" — for 3+ smaller stories grouped as bullet points
     - "### 🔮 Looking Ahead"
3. **Content**: Write 2-4 flowing sentences per section. Do NOT simply concatenate segments — rewrite into a unified narrative. Deduplicate stories that appear in multiple segments. Use specific details (game names, studio names, numbers) from the source material.
4. **Formatting**: Bullet points only for lists of 3+ small items. Blank line between sections. Emojis in headings only.
5. **Arabic version**: EXACT same structure — same sections (translated), same emoji usage, same flow. Write in clear Modern Standard Arabic (فصحى).
6. **Length**: Each language version must be between ~1,800 and ~2,500 characters (hard limit: 5,000 bytes). Be dense and decisive — avoid redundant phrasing.

OUTPUT: A JSON object with keys "arabic" and "english", each containing the full polished Markdown recap.

Arabic Segments:
${arabicSummaries}

English Segments:
${englishSummaries}`;

function parseJsonSummary(rawText: string): SummaryResponse {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error('Failed to parse AI JSON: ' + rawText.substring(0, 50));
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiWithRetry(prompt: string, maxRetries = 3): Promise<SummaryResponse> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      logger.info(`🤖 Trying Gemini... (Attempt ${attempt}/${maxRetries})`);

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  arabic: { type: 'STRING' },
                  english: { type: 'STRING' },
                },
                required: ['arabic', 'english'],
              },
            },
          }),
        },
      );

      const aiData = await aiResponse.json();

      if (aiData.error) {
        throw new Error(`Gemini API Error: ${JSON.stringify(aiData.error)}`);
      }

      if (!aiData.candidates?.length) {
        throw new Error(`Gemini returned no candidates: ${JSON.stringify(aiData)}`);
      }

      const rawText = aiData.candidates[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini returned empty text.');
      }

      return parseJsonSummary(rawText);
    } catch (error: any) {
      logger.error(`❌ Gemini attempt ${attempt} failed: ${error.message}`);
      if (attempt >= maxRetries) {
        throw error;
      }
      const backoffTime = Math.pow(2, attempt) * 1000;
      logger.info(`Waiting ${backoffTime / 1000}s before retrying...`);
      await delay(backoffTime);
    }
  }
}

async function summarizeWithGemini(
  newsText: string,
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
  return callGeminiWithRetry(prompt);
}

function mergeSummariesWithGemini(
  startDate: string,
  endDate: string,
  arabicSummaries: string,
  englishSummaries: string,
): Promise<SummaryResponse> {
  logger.info('🤖 Merging chunk summaries with Gemini...');
  return callGeminiWithRetry(
    MERGE_SUMMARY_PROMPT(startDate, endDate, arabicSummaries, englishSummaries),
  );
}

function getSevenDaysAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
}

async function fetchLastWeekNewsTitles() {
  const sevenDaysAgo = getSevenDaysAgoIso();
  let allDocuments: sdk.Models.Document[] = [];
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
  let { arabic, english } = summary;
  for (const [lang, value] of [
    ['Arabic', arabic],
    ['English', english],
  ] as const) {
    const truncated = truncateByBytes(value, MAX_SUMMARY_BYTES);
    if (truncated !== value) {
      logger.warn(
        `⚠️ ${lang} summary exceeded ${MAX_SUMMARY_BYTES} bytes – truncated to ${truncated.length} characters.`,
      );
    }
    if (lang === 'Arabic') arabic = truncated;
    else english = truncated;
  }

  await databases.createDocument(DATABASE_ID, SUMMARIES_COLLECTION_ID, sdk.ID.unique(), {
    summary_ar: arabic,
    summary_en: english,
    startDate,
    endDate: new Date().toISOString(),
  });
}

async function runGenerateWeeklySummary() {
  try {
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
      const desc = (doc as any).description
        ? (doc as any).description.substring(0, 150).replace(/\n/g, ' ') + '...'
        : '';
      return `- ${(doc as any).title}\n  ${desc}`;
    };

    if (documents.length <= CHUNK_SIZE) {
      const newsText = documents.map(formatDoc).join('\n');
      logger.info(`Sending all ${documents.length} articles in a single batch to AI...`);
      jsonSummary = await summarizeWithGemini(newsText, {
        isPartial: false,
        startDate: sevenDaysAgo,
        endDate,
      });
      logger.info('✅ Gemini succeeded.');
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

        const summary = await summarizeWithGemini(chunkText, {
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
      const arabicSummaries = chunkSummaries
        .map((s, idx) => `[Batch ${idx + 1} Arabic Recap segment]:\n${s.arabic}`)
        .join('\n\n');
      const englishSummaries = chunkSummaries
        .map((s, idx) => `[Batch ${idx + 1} English Recap segment]:\n${s.english}`)
        .join('\n\n');

      jsonSummary = await mergeSummariesWithGemini(
        sevenDaysAgo,
        endDate,
        arabicSummaries,
        englishSummaries,
      );
      logger.info('✅ Gemini merging succeeded.');
    }

    logger.info('Summary generated successfully. Saving to Appwrite...');
    await saveWeeklySummary(jsonSummary, sevenDaysAgo);
    logger.info('✅ Weekly summary saved!');
  } catch (error: any) {
    logger.error('❌ Error generating summary:', error.message);
    if (error instanceof SyntaxError) {
      logger.info('JSON Parse Error – check the raw AI response.');
    }

    throw error;
  }
}

export { runGenerateWeeklySummary };
