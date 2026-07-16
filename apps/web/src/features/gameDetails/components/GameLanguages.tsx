import { Globe, Check } from "lucide-react";
import { GameLanguagesProps } from "../types";

export default function GameLanguages({ languageRows, t, lang}: GameLanguagesProps) {
  const isRtl = lang === "ar";
  const textDirectionClass = isRtl ? "text-right" : "text-left";

  if (languageRows.length === 0) return null;

  return (
    <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl overflow-hidden">
      <h2
        className={`text-lg font-black text-white border-b border-white/5 pb-2 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
      >
        <Globe className="w-5 h-5 text-light-blue" />
        <span>{t("games.details.languages.title")}</span>
      </h2>

      <div className="overflow-x-auto scrollbar">
        <table className="w-full border-collapse text-xs sm:text-sm min-w-[400px]">
          <thead>
            <tr
              className={`border-b border-white/10 text-gray-400 uppercase font-black tracking-wider text-[9px] sm:text-[10px] ${textDirectionClass}`}
            >
              <th
                className={`py-3 px-4 ${isRtl ? "text-right" : "text-left"}`}
              >
                {t("games.details.languages.Language")}
              </th>
              <th className="py-3 px-4 text-center">
                {t("games.details.languages.audio")}
              </th>
              <th className="py-3 px-4 text-center">
                {t("games.details.languages.subtitles")}
              </th>
              <th className="py-3 px-4 text-center">
                {t("games.details.languages.interface")}
              </th>
            </tr>
          </thead>
          <tbody>
            {languageRows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                  i % 2 === 0 ? "bg-white/2" : "bg-transparent"
                }`}
              >
                <td
                  className={`py-3.5 px-4 font-extrabold text-white capitalize ${isRtl ? "text-right" : "text-left"}`}
                >
                  {(() => {
                    const translated = t(
                      `games.details.languages.names.${row.name}`,
                    );
                    return translated.startsWith(
                      "games.details.languages.names.",
                    )
                      ? row.name
                      : translated;
                  })()}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {row.Audio ? (
                    <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-light-blue/15 border border-light-blue/20 text-light-blue shadow-sm shadow-light-blue/5">
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </span>
                  ) : (
                    <span className="text-gray-600 font-bold">-</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {row.Subtitles ? (
                    <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-light-blue/15 border border-light-blue/20 text-light-blue shadow-sm shadow-light-blue/5">
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </span>
                  ) : (
                    <span className="text-gray-600 font-bold">-</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {row.Interface ? (
                    <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-light-blue/15 border border-light-blue/20 text-light-blue shadow-sm shadow-light-blue/5">
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </span>
                  ) : (
                    <span className="text-gray-600 font-bold">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
