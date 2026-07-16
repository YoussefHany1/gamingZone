import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSendMessage: (text: string) => void;
  loading: boolean;
  user: any;
  t: (key: string) => string;
}

export default function ChatInput({
  input,
  setInput,
  handleSendMessage,
  loading,
  user,
  t,
}: ChatInputProps) {
  return (
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
        className="grow p-4 rounded-2xl glass-panel border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-light-blue text-sm leading-normal shadow-lg transition-all duration-300"
        disabled={loading || !user}
      />
      <button
        type="submit"
        className="p-4 bg-linear-to-tr from-light-blue to-secondary-blue hover:opacity-90 active:scale-95 text-white rounded-2xl shadow-lg shadow-light-blue/20 transition-all duration-300"
        disabled={loading || !input.trim() || !user}
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
