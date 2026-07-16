import { GameAboutProps } from "../types";

export default function GameAbout({ summary, t, lang}: GameAboutProps) {
  const isRtl = lang === "ar";
  const textDirectionClass = isRtl ? "text-right" : "text-left";

  if (!summary) return null;

  return (
    <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
      <h2
        className={`text-lg font-black text-white border-b border-white/5 pb-2 ${textDirectionClass}`}
      >
        {t("games.details.about")}
      </h2>
      <p
        className={`text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line ${textDirectionClass}`}
      >
        {summary}
      </p>
    </section>
  );
}
