import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: Request) {
  try {
    const { history, uid } = await request.json();

    if (!uid || !history) {
      return NextResponse.json({ error: "Missing uid or history" }, { status: 400 });
    }

    let gamesContext = "";
    
    // Fetch user context
    try {
      const db = getAdminDb();
      const userDocSnap = await db.collection("users").doc(uid).get();
      const userData = userDocSnap.data() || {};
      
      gamesContext = `User Profile Information:\n`;
      gamesContext += `- Name: ${userData.displayName || "Gamer"}\n`;
      if (userData.country) gamesContext += `- Country: ${userData.country}\n`;
      if (userData.platform) gamesContext += `- Preferred Platform: ${userData.platform}\n`;
      if (userData.gender) gamesContext += `- Gender: ${userData.gender}\n`;
      
      gamesContext += `\nUser Games Lists:\n`;
      const listsSnap = await db.collection("users").doc(uid).collection("lists").get();
      if (listsSnap.empty) {
        gamesContext += "(User has no custom game lists yet)\n";
      } else {
        for (const listDoc of listsSnap.docs) {
          const listName = listDoc.data().name || listDoc.id;
          const gamesSnap = await db.collection("users")
            .doc(uid)
            .collection("lists")
            .doc(listDoc.id)
            .collection("games")
            .get();
          
          if (!gamesSnap.empty) {
            const games = gamesSnap.docs.map((g) => g.data().name).join(", ");
            gamesContext += `- ${listName}: ${games}\n`;
          } else {
            gamesContext += `- ${listName}: (Empty)\n`;
          }
        }
      }
    } catch (e) {
      console.error("Error fetching context:", e);
    }

    const systemPrompt = {
      role: "system",
      content: `You are a friendly and knowledgeable AI assistant in a web app called "Gaming Zone". 
Your sole purpose is to discuss video games, gaming news, recommendations, hardware, and e-sports. 
Do NOT answer questions outside the domain of video games. If asked about something else, politely decline and steer the conversation back to gaming.

Here is the context about the current user (Use this information to personalize your answers. For example, recommend games available on their preferred platform, related to games they play, or acknowledge their favorites):
${gamesContext}`,
    };

    const payload = [systemPrompt, ...history];

    try {
      if (!GEMINI_API_KEY) throw new Error("Missing Gemini Key");
      
      // Map history for Gemini format
      const geminiMessages = payload.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
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
        const errorText = await response.text();
        console.error("Gemini failed:", response.status, errorText);
        throw new Error("Gemini failed");
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      return NextResponse.json({ text, model: "Gemini" });
    } catch (err) {
      console.log("Falling back to Groq...");
      
      if (!GROQ_API_KEY) {
        return NextResponse.json({ error: "AI providers unavailable" }, { status: 500 });
      }
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq failed:", response.status, errorText);
        return NextResponse.json({ error: "All AI providers failed" }, { status: 500 });
      }

      const data = await response.json();
      const text = data.choices[0].message.content;

      return NextResponse.json({ text, model: "Groq Llama-3" });
    }
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
