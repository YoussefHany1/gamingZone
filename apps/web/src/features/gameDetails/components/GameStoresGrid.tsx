import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { GameStoresGridProps } from "../types";

export default function GameStoresGrid({ gameStores, t, lang}: GameStoresGridProps) {
  const isRtl = lang === "ar";

  if (gameStores.length === 0) return null;

  return (
    <section className="glass-panel border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
      <h2
        className={`text-lg font-black text-white border-b border-white/5 pb-2 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
      >
        <ShoppingCart className="w-5 h-5 text-light-blue" />
        <span>{t("games.details.availableStores")}</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {gameStores.map((store) => (
          <a
            key={store.id}
            href={store.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between p-3.5 rounded-2xl border bg-linear-to-r ${store.bg} hover:scale-102 transition-all active:scale-98 shadow-md ${isRtl ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="relative w-6 h-6 shrink-0">
                <Image
                  src={store.logo}
                  alt={store.name}
                  width={50}
                  height={50}
                  className="object-contain filter brightness-110"
                  style={{ width: "auto", height: "auto" }}
                />
              </div>
              <span className="font-black text-xs sm:text-sm tracking-wide">
                {store.name}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
