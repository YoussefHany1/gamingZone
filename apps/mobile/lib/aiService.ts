import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
}

// Ensure EXPO_PUBLIC keys are defined in your .env
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.replace(/^"|"$/g, '');
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY?.replace(/^"|"$/g, '');

/**
 * Fetches user games and profile from Firestore to provide rich context to the AI
 */
async function getUserGamesContext(): Promise<string> {
  const currentUser = auth().currentUser;
  if (!currentUser) return "";

  try {
    const userDocRef = firestore().collection("users").doc(currentUser.uid);
    const userDocSnap = await userDocRef.get();
    const userData = userDocSnap.data() || {};

    let context = `User Profile Information:\n`;
    context += `- Name: ${currentUser.displayName || userData.displayName || "Gamer"}\n`;
    if (userData.country) context += `- Country: ${userData.country}\n`;
    if (userData.platform) context += `- Preferred Platform: ${userData.platform}\n`;
    if (userData.gender) context += `- Gender: ${userData.gender}\n`;
    if (userData.dob) context += `- Date of Birth: ${userData.dob}\n`;

    context += `\nUser Games Lists:\n`;

    const listsSnap = await userDocRef.collection("lists").get();

    if (listsSnap.empty) {
      context += "(User has no custom game lists yet)\n";
    } else {
      for (const listDoc of listsSnap.docs) {
        const listName = listDoc.data().name || listDoc.id;
        const gamesSnap = await userDocRef.collection("lists").doc(listDoc.id).collection("games").get();
        if (!gamesSnap.empty) {
          const games = gamesSnap.docs.map(g => g.data().name).join(", ");
          context += `- ${listName}: ${games}\n`;
        } else {
          context += `- ${listName}: (Empty)\n`;
        }
      }
    }

    return context;
  } catch (error) {
    console.error("Error fetching context:", error);
    return "";
  }
}

/**
 * Calls Gemini 2.5 Flash
 */
async function callGemini(messages: ChatMessage[]): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

  // Format messages for Gemini
  const geminiMessages = messages.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: geminiMessages }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Calls Groq llama3-8b-8192
 */
async function callGroq(messages: ChatMessage[]): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Missing Groq API Key");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Main exposed function: gets system context, appends history, applies fallback strategy
 */
export async function sendChatMessage(history: ChatMessage[]): Promise<{ text: string, model: string }> {
  const gamesContext = await getUserGamesContext();

  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are a friendly and knowledgeable AI assistant in a mobile app called "Gaming Zone". 
Your sole purpose is to discuss video games, gaming news, recommendations, hardware, and e-sports. 
Do NOT answer questions outside the domain of video games. If asked about something else, politely decline and steer the conversation back to gaming.

Here is the context about the current user (Use this information to personalize your answers. For example, recommend games available on their preferred platform, related to games they play, or acknowledge their favorites):
${gamesContext}`
  };

  const payload = [systemPrompt, ...history];

  // Strategy: Gemini -> Groq
  try {
    console.log("Attempting Gemini...");
    const text = await callGemini(payload);
    return { text, model: "Gemini" };
  } catch (errGemini) {
    console.warn("Gemini failed, trying Groq...", errGemini);
    try {
      const text = await callGroq(payload);
      return { text, model: "Groq Llama-3" };
    } catch (errGroq) {
      console.error("All AI providers failed.", errGroq);
      throw new Error("All AI providers are currently unavailable.");
    }
  }
}
