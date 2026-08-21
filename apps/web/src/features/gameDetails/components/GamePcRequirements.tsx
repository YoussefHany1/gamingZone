import { Monitor, Cpu } from "lucide-react";
import { GamePcRequirementsProps } from "../types";

export default function GamePcRequirements({
  pcSpecs,
  t,
}: GamePcRequirementsProps) {
  if (!pcSpecs) return null;

  return (
    <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-5 shadow-xl">
      <h2 className="text-lg font-black text-white border-b border-white/5 pb-2 flex items-center gap-2">
        <Monitor className="w-5 h-5 text-light-blue" />
        <span>{t("games.details.pcRequirements")}</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Minimum Specs */}
        {pcSpecs.minimum.length > 0 && (
          <div className="space-y-3.5">
            <h3 className="text-sm font-black text-light-blue flex items-center gap-2 border-b border-white/5 pb-1.5">
              <Cpu className="w-4 h-4" />
              <span>{t("games.details.minimum")}</span>
            </h3>
            <div className="space-y-3">
              {pcSpecs.minimum.map((row, i) => (
                <div key={i} className="text-xs space-y-1">
                  <span className="text-gray-400 font-bold block capitalize">
                    {row.label}
                  </span>
                  <span className="text-gray-200 block bg-white/5 px-3 py-2 rounded-xl leading-relaxed">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Specs */}
        {pcSpecs.recommended.length > 0 && (
          <div className="space-y-3.5">
            <h3 className="text-sm font-black text-light-blue flex items-center gap-2 border-b border-white/5 pb-1.5">
              <Cpu className="w-4 h-4" />
              <span>{t("games.details.recommended")}</span>
            </h3>
            <div className="space-y-3">
              {pcSpecs.recommended.map((row, i) => (
                <div key={i} className="text-xs space-y-1">
                  <span className="text-gray-400 font-bold block capitalize">
                    {row.label}
                  </span>
                  <span className="text-gray-200 block bg-white/5 px-3 py-2 rounded-xl leading-relaxed">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
