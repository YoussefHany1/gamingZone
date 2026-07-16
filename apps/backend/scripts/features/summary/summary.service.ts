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

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required for weekly summary generation.');
}

const databases = createAppwriteDatabases();

interface SummaryResponse {
  arabic: string;
  english: string;
}

const SUMMARY_PROMPT = (newsText: string) => `You are a professional gaming news editor.
Analyze the provided list of gaming news HEADLINES and create a Weekly Recap in TWO languages (Arabic and English).

IMPORTANT: Return the result strictly as a valid JSON object. Do NOT add Markdown formatting like \`\`\`json.

The JSON structure must be:
{
  "arabic": "## (عنوان الملخص الأسبوعي)... (Write the summary based on these headlines using Markdown and emojis)",
  "english": "## (Weekly Recap Title)... (Write the summary based on these headlines using Markdown and emojis)"
}

The Headlines List:
${newsText}`;

const PARTIAL_SUMMARY_PROMPT = (newsText: string) => `You are a professional gaming news editor.
Analyze the provided batch of gaming news HEADLINES and create a VERY DENSE and CONCISE (مكثف وموجز) Weekly Recap segment in TWO languages (Arabic and English).
Keep it concise so that multiple segment summaries can be merged later without exceeding model context limits.

IMPORTANT: Return the result strictly as a valid JSON object. Do NOT add Markdown formatting like \`\`\`json.

The JSON structure must be:
{
  "arabic": "## (عنوان الملخص الأسبوعي)... (Write a highly dense and concise summary segment based on these headlines using Markdown and emojis)",
  "english": "## (Weekly Recap Title)... (Write a highly dense and concise summary segment based on these headlines using Markdown and emojis)"
}

The Headlines List:
${newsText}`;

const MERGE_SUMMARY_PROMPT = (
  arabicSummaries: string,
  englishSummaries: string,
) => `You are a professional gaming news editor.
Analyze the following weekly recaps generated from different batches of gaming news articles and merge them into a single consolidated, cohesive Weekly Recap in TWO languages (Arabic and English). Keep the markdown and emojis engaging.

IMPORTANT: Return the result strictly as a valid JSON object. Do NOT add Markdown formatting like \`\`\`json.

The JSON structure must be:
{
  "arabic": "## (عنوان الملخص الأسبوعي)... (Write the consolidated summary based on the provided Arabic recaps using Markdown and emojis)",
  "english": "## (Weekly Recap Title)... (Write the consolidated summary based on the provided English recaps using Markdown and emojis)"
}

Arabic Recaps to merge:
${arabicSummaries}

English Recaps to merge:
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

async function summarizeWithGemini(newsText: string, isPartial = false): Promise<SummaryResponse> {
  const prompt = isPartial ? PARTIAL_SUMMARY_PROMPT(newsText) : SUMMARY_PROMPT(newsText);
  return callGeminiWithRetry(prompt);
}

async function mergeSummariesWithGemini(
  arabicSummaries: string,
  englishSummaries: string,
): Promise<SummaryResponse> {
  logger.info('🤖 Merging chunk summaries with Gemini...');
  return callGeminiWithRetry(MERGE_SUMMARY_PROMPT(arabicSummaries, englishSummaries));
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

async function saveWeeklySummary(summary: SummaryResponse, startDate: string) {
  await databases.createDocument(DATABASE_ID, SUMMARIES_COLLECTION_ID, sdk.ID.unique(), {
    summary_ar: summary.arabic,
    summary_en: summary.english,
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
      jsonSummary = await summarizeWithGemini(newsText, false);
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

        const summary = await summarizeWithGemini(chunkText, true);
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

      jsonSummary = await mergeSummariesWithGemini(arabicSummaries, englishSummaries);
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
