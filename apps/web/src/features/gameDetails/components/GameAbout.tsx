import { GameAboutProps } from "../types";

export default function GameAbout({ summary, t }: GameAboutProps) {
  if (!summary) return null;

  return (
    <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
      <h2 className="text-lg font-black text-white border-b border-white/5 pb-2">
        {t("games.details.about")}
      </h2>
      <p className="text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line text-left">
        {summary}
      </p>
    </section>
  );
}
