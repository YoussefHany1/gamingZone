import { Sparkles, Trash2 } from "lucide-react";

interface ChatHeaderProps {
  t: (key: string) => string;
  lang: string;
  remaining: number | null;
  hasMessages: boolean;
  clearChat: () => void;
}

export default function ChatHeader({
  t,
  lang,
  remaining,
  hasMessages,
  clearChat,
}: ChatHeaderProps) {
  return (
    <div className="glass-panel border border-white/10 p-5 rounded-2xl flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-linear-to-tr from-light-blue to-secondary-blue rounded-2xl text-white animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold bg-linear-to-r from-white to-light-blue bg-clip-text text-transparent">
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
        {hasMessages && (
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
  );
}
