import { GameSpecificationsProps } from "../types";

export default function GameSpecifications({ game, t, lang}: GameSpecificationsProps) {
  const isRtl = lang === "ar";
  const textDirectionClass = isRtl ? "text-right" : "text-left";

  return (
    <div className="glass-panel border border-white/10 p-6 rounded-3xl space-y-5 shadow-xl">
      {/* <h2
        className={`text-base font-black text-white border-b border-white/5 pb-2 ${textDirectionClass}`}
      >
        {t("games.details.specifications")}
      </h2> */}

      <div className="space-y-4 text-xs">
        {/* Developers */}
        {game.involved_companies?.some((c) => c.developer) && (
          <div className={`space-y-1 ${textDirectionClass}`}>
            <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
              {t("games.details.developer")}
            </span>
            <div className="text-gray-200 font-extrabold text-sm">
              {game.involved_companies
                .filter((c) => c.developer)
                .map((c) => c.company.name)
                .join(", ")}
            </div>
          </div>
        )}

        {/* Publishers */}
        {game.involved_companies?.some((c) => c.publisher) && (
          <div
            className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
          >
            <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
              {t("games.details.publisher")}
            </span>
            <div className="text-gray-200 font-extrabold text-sm">
              {game.involved_companies
                .filter((c) => c.publisher)
                .map((c) => c.company.name)
                .join(", ")}
            </div>
          </div>
        )}

        {/* Genres */}
        {game.genres && game.genres.length > 0 && (
          <div
            className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
          >
            <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
              {t("games.details.genres")}
            </span>
            <div
              className={`flex flex-wrap gap-1.5 mt-1 ${isRtl ? "justify-start flex-row-reverse" : "justify-start"}`}
            >
              {game.genres.map((g) => (
                <span
                  key={g.id}
                  className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold"
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Game Modes */}
        {game.game_modes && game.game_modes.length > 0 && (
          <div
            className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
          >
            <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
              {t("games.details.gameModes")}
            </span>
            <div
              className={`flex flex-wrap gap-1.5 mt-1 ${isRtl ? "justify-start flex-row-reverse" : "justify-start"}`}
            >
              {game.game_modes.map((m) => (
                <span
                  key={m.id}
                  className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold"
                >
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Game Engines */}
        {game.game_engines && game.game_engines.length > 0 && (
          <div
            className={`space-y-1 pt-3 border-t border-white/5 ${textDirectionClass}`}
          >
            <span className="text-gray-400 font-bold uppercase tracking-wider block text-[9px]">
              {t("games.details.engines")}
            </span>
            <div className="text-gray-200 font-extrabold text-sm">
              {game.game_engines.map((e) => e.name).join(", ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
