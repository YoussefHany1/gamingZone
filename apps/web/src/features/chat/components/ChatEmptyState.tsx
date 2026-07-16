import { MessageSquare } from "lucide-react";

interface ChatEmptyStateProps {
  t: (key: string) => string;
  handleSendMessage: (text: string) => void;
}

export default function ChatEmptyState({ t, handleSendMessage }: ChatEmptyStateProps) {
  const suggestions = [
    t("aiChat.suggestions.basedOnList"),
    t("aiChat.suggestions.bestAdventure"),
    t("aiChat.suggestions.coopGames"),
    t("aiChat.suggestions.newReleases"),
  ];

  return (
    <div className="grow flex flex-col justify-center items-center gap-6 max-w-xl mx-auto text-center h-full">
      <div className="p-4 bg-white/5 border border-white/5 rounded-full text-light-blue">
        <MessageSquare className="w-12 h-12" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-black text-white">{t("aiChat.emptyList")}</h3>
        <p className="text-sm text-gray-400">{t("aiChat.placeholder")}</p>
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
  );
}
