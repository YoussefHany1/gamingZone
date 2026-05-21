"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useAuthStore } from "../../store/useAuthStore";
import { useLangStore } from "../../store/useLangStore";
import {
  Send,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Cpu,
  Trash2,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatPage() {
  const { lang, t } = useLangStore();
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    t("aiChat.suggestions.basedOnList"),
    t("aiChat.suggestions.bestAdventure"),
    t("aiChat.suggestions.coopGames"),
    t("aiChat.suggestions.newReleases"),
  ];

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading || !user) return;
    setErrorMsg(null);
    setModelUsed(null);

    const newUserMsg: ChatMessage = { role: "user", content: text };
    const updatedHistory = [...messages, newUserMsg];

    setMessages(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: updatedHistory,
          uid: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("aiChat.error"));
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text },
      ]);
      setModelUsed(data.model);
      if (typeof data.remaining === "number") {
        setRemaining(data.remaining);
      }
    } catch (error: any) {
      console.error("AI chat client error:", error);
      setErrorMsg(error.message || t("aiChat.error"));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setErrorMsg(null);
    setModelUsed(null);
  };

  return (
    <div className="min-h-screen flex flex-col text-white">
      <Header />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-6 h-[calc(100vh-140px)]">
        {/* Chat Header Card */}
        <div className="glass-panel border border-white/10 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-light-blue to-secondary-blue rounded-2xl text-white animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-white to-light-blue bg-clip-text text-transparent">
                {t("aiChat.title")}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Powered by Gemini 2.5 Flash & Llama 3.1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {remaining !== null && (
              <span className="text-xs font-mono bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg text-light-blue">
                {remaining} / 20 {lang === "ar" ? "رسائل متبقية" : "msgs left"}
              </span>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                title="Clear Chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation Box */}
        <div className="flex-grow glass-panel border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden shadow-xl min-h-0 relative">
          {messages.length === 0 ? (
            // Idle suggestions screen
            <div className="flex-grow flex flex-col justify-center items-center gap-6 max-w-xl mx-auto text-center h-full">
              <div className="p-4 bg-white/5 border border-white/5 rounded-full text-light-blue">
                <MessageSquare className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  {t("aiChat.emptyList")}
                </h3>
                <p className="text-sm text-gray-400">
                  {t("aiChat.placeholder")}
                </p>
              </div>

              {/* Quick suggestions lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug)}
                    className="p-3 text-sm font-semibold text-gray-300 bg-white/5 border border-white/5 rounded-xl text-left hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-300 leading-normal"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message lists
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar min-h-0">
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom duration-300`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed border ${
                        isUser
                          ? "bg-gradient-to-tr from-secondary-blue to-light-blue border-white/10 text-white rounded-br-none shadow-md"
                          : "bg-white/5 border-white/5 text-gray-200 rounded-bl-none prose prose-invert max-w-none"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bot typing status loader */}
              {loading && (
                <div className="flex justify-start animate-pulse">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-gray-400 rounded-bl-none text-xs flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-light-blue rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-light-blue rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-light-blue rounded-full animate-bounce delay-200"></span>
                    </span>
                    <span>{t("aiChat.typing")}</span>
                  </div>
                </div>
              )}

              {/* Error indicator */}
              {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div ref={messagesEndRef}></div>
            </div>
          )}

          {/* Model info tags */}
          {modelUsed && (
            <div className="absolute bottom-2 left-6 text-[10px] text-gray-500 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-light-blue" />
              <span>Served by {modelUsed}</span>
            </div>
          )}
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("aiChat.placeholder")}
            className="flex-grow p-4 rounded-2xl glass-panel border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-light-blue text-sm leading-normal shadow-lg transition-all duration-300"
            disabled={loading || !user}
          />
          <button
            type="submit"
            className="p-4 bg-gradient-to-tr from-light-blue to-secondary-blue hover:opacity-90 active:scale-95 text-white rounded-2xl shadow-lg shadow-light-blue/20 transition-all duration-300"
            disabled={loading || !input.trim() || !user}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
