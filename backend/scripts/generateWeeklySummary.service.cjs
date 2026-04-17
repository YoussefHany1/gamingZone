const sdk = require("node-appwrite");

const { loadBackendEnv } = require("./lib/env.cjs");
const {
  createAppwriteDatabases,
  requireEnvVar,
} = require("./lib/appwrite.cjs");

loadBackendEnv();

const GEMINI_API_KEY = requireEnvVar("GEMINI_API_KEY");
const DATABASE_ID = requireEnvVar("APPWRITE_DATABASE_ID");
const NEWS_COLLECTION_ID = process.env.ARTICLES_COLLECTION_ID;
const SUMMARIES_COLLECTION_ID = "weekly_summaries";

if (!NEWS_COLLECTION_ID) {
  throw new Error(
    "Missing required environment variable: ARTICLES_COLLECTION_ID",
  );
}

const databases = createAppwriteDatabases();

const SUMMARY_PROMPT = (newsText) => `You are a professional gaming news editor.
Analyze the provided list of gaming news HEADLINES and create a Weekly Recap in TWO languages (Arabic and English).

IMPORTANT: Return the result strictly as a valid JSON object. Do NOT add Markdown formatting like \`\`\`json.

The JSON structure must be:
{
  "arabic": "## (عنوان الملخص الأسبوعي)... (Write the summary based on these headlines using Markdown and emojis)",
  "english": "## (Weekly Recap Title)... (Write the summary based on these headlines using Markdown and emojis)"
}

The Headlines List:
${newsText}`;

function parseJsonSummary(rawText) {
  let cleanedText = rawText;
  const firstBrace = cleanedText.indexOf("{");
  const lastBrace = cleanedText.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
  } else {
    cleanedText = cleanedText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
  }

  const parsed = JSON.parse(cleanedText);
  if (!parsed?.arabic || !parsed?.english) {
    throw new Error("AI response JSON is missing arabic or english fields.");
  }

  return parsed;
}

async function summarizeWithGemini(newsText) {
  console.log("🤖 Trying Gemini...");

  const aiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SUMMARY_PROMPT(newsText) }] }],
        generationConfig: { response_mime_type: "application/json" },
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
    throw new Error("Gemini returned an empty summary.");
  }

  return parseJsonSummary(rawText);
}

function getSevenDaysAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
}

async function fetchLastWeekNewsTitles() {
  const sevenDaysAgo = getSevenDaysAgoIso();

  const response = await databases.listDocuments(
    DATABASE_ID,
    NEWS_COLLECTION_ID,
    [sdk.Query.greaterThan("pubDate", sevenDaysAgo), sdk.Query.limit(150)],
  );

  return {
    sevenDaysAgo,
    documents: response.documents,
  };
}

async function saveWeeklySummary(summary, startDate) {
  await databases.createDocument(
    DATABASE_ID,
    SUMMARIES_COLLECTION_ID,
    sdk.ID.unique(),
    {
      summary_ar: summary.arabic,
      summary_en: summary.english,
      startDate,
      endDate: new Date().toISOString(),
    },
  );
}

async function runGenerateWeeklySummary() {
  try {
    console.log("Fetching news from the last 7 days...");

    const { sevenDaysAgo, documents } = await fetchLastWeekNewsTitles();
    if (!documents.length) {
      console.log("No news found to summarize.");
      return;
    }

    const newsText = documents.map((doc) => `- ${doc.title}`).join("\n");
    console.log(`Found ${documents.length} articles. Sending to AI...`);

    let jsonSummary = null;
    try {
      jsonSummary = await summarizeWithGemini(newsText);
      console.log("✅ Gemini succeeded.");
    } catch (geminiError) {
      console.error("❌ Gemini failed:", geminiError.message);
      throw geminiError;
    }

    console.log("Summary generated successfully. Saving to Appwrite...");
    await saveWeeklySummary(jsonSummary, sevenDaysAgo);
    console.log("✅ Weekly summary saved!");
  } catch (error) {
    console.error("❌ Error generating summary:", error.message);
    if (error instanceof SyntaxError) {
      console.log("JSON Parse Error – check the raw AI response.");
    }

    throw error;
  }
}

module.exports = {
  runGenerateWeeklySummary,
};
