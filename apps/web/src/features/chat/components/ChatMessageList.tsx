import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Cpu } from "lucide-react";
import { ChatMessage } from "../types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  errorMsg: string | null;
  t: (key: string) => string;
  modelUsed: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatMessageList({
  messages,
  loading,
  errorMsg,
  t,
  modelUsed,
  messagesEndRef,
}: ChatMessageListProps) {
  return (
    <>
      <div className="grow overflow-y-auto space-y-4 pr-2 scrollbar min-h-0">
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
                    ? "bg-linear-to-tr from-secondary-blue to-light-blue border-white/10 text-white rounded-br-none shadow-md"
                    : "bg-white/5 border-white/5 text-gray-200 rounded-bl-none prose prose-invert max-w-none"
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
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
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Model info tags */}
      {modelUsed && (
        <div className="absolute bottom-2 left-6 text-[10px] text-gray-500 flex items-center gap-1">
          <Cpu className="w-3 h-3 text-light-blue" />
          <span>Served by {modelUsed}</span>
        </div>
      )}
    </>
  );
}
