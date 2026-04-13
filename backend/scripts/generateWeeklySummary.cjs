const sdk = require("node-appwrite");
require("dotenv").config({ path: "F:\\Programing\\GamingZone\\backend\\.env" });

const client = new sdk.Client();
const databases = new sdk.Databases(client);

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NEWS_COLLECTION_ID = process.env.ARTICLES_COLLECTION_ID;
const SUMMARIES_COLLECTION_ID = "weekly_summaries";
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

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
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    rawText = rawText.substring(firstBrace, lastBrace + 1);
  } else {
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  }
  return JSON.parse(rawText);
}

async function summarizeWithGemini(newsText) {
  console.log("🤖 Trying Gemini...");
  const aiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SUMMARY_PROMPT(newsText) }] }],
        generationConfig: { response_mime_type: "application/json" },
      }),
    }
  );

  const aiData = await aiResponse.json();

  if (aiData.error) {
    throw new Error(`Gemini API Error: ${JSON.stringify(aiData.error)}`);
  }
  if (!aiData.candidates || aiData.candidates.length === 0) {
    throw new Error(`Gemini returned no candidates: ${JSON.stringify(aiData)}`);
  }

  const rawText = aiData.candidates[0].content.parts[0].text;
  return parseJsonSummary(rawText);
}

async function summarizeWithCohere(newsText) {
  console.log("🤖 Trying Cohere as fallback...");
  const aiResponse = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${COHERE_API_KEY}`,
      "X-Client-Name": "GamingZone",
    },
    body: JSON.stringify({
      model: "command-r-plus-08-2024",
      messages: [{ role: "user", content: SUMMARY_PROMPT(newsText) }],
      temperature: 0.3,
    }),
  });

  const aiData = await aiResponse.json();

  if (!aiData.message || !aiData.message.content || !aiData.message.content[0].text) {
    throw new Error(`Cohere returned unexpectedly: ${JSON.stringify(aiData)}`);
  }

  const rawText = aiData.message.content[0].text;
  return parseJsonSummary(rawText);
}

async function generateSummary() {
  try {
    console.log("Fetching news from the last 7 days...");

    const date = new Date();
    date.setDate(date.getDate() - 7);
    const sevenDaysAgo = date.toISOString();

    const response = await databases.listDocuments(
      DATABASE_ID,
      NEWS_COLLECTION_ID,
      [sdk.Query.greaterThan("pubDate", sevenDaysAgo), sdk.Query.limit(200)]
    );

    if (response.documents.length === 0) {
      console.log("No news found to summarize.");
      return;
    }

    let newsText = "";
    response.documents.forEach((doc) => {
      newsText += `- ${doc.title}\n`;
    });

    console.log(
      `Found ${response.documents.length} articles. Sending to AI...`
    );

    // --- محاولة Gemini أولاً، ثم Cohere كبديل ---
    let jsonSummary;
    try {
      jsonSummary = await summarizeWithGemini(newsText);
      console.log("✅ Gemini succeeded.");
    } catch (geminiError) {
      console.error("❌ Gemini failed:", geminiError.message);
      console.log("⚠️  Falling back to Cohere...");
      jsonSummary = await summarizeWithCohere(newsText);
      console.log("✅ Cohere succeeded.");
    }

    console.log("Summary generated successfully. Saving to Appwrite...");

    await databases.createDocument(
      DATABASE_ID,
      SUMMARIES_COLLECTION_ID,
      sdk.ID.unique(),
      {
        summary_ar: jsonSummary.arabic,
        summary_en: jsonSummary.english,
        startDate: sevenDaysAgo,
        endDate: new Date().toISOString(),
      }
    );

    console.log("✅ Weekly summary saved!");
  } catch (error) {
    console.error("❌ Error generating summary:", error.message);
    if (error instanceof SyntaxError) {
      console.log("JSON Parse Error – check the raw AI response.");
    }
  }
}

generateSummary();
