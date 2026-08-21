import Image from "next/image";
import { getTranslations } from "@/i18n/server";

export default function AppAdvertisement({
  locale = "ar",
}: {
  locale?: string;
}) {
  const t = getTranslations(locale);

  return (
    <div className="w-full rounded-2xl overflow-hidden relative my-12 bg-linear-to-tr from-light-blue/20 to-secondary-blue/20 border border-white/10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 shadow-2xl">
      <div className="absolute inset-0 bg-dark-bg/40 z-0"></div>

      <div
        className={`relative z-10 flex flex-col items-center md:items-start text-center ${locale === "ar" ? "md:text-right" : "md:text-left"} gap-4 max-w-2xl mx-auto md:mx-0`}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-wide">
          {t("appAdvertisement.titlePrefix")}{" "}
          <span className="text-light-blue">
            {t("appAdvertisement.titleHighlight")}
          </span>{" "}
          {t("appAdvertisement.titleSuffix")}
        </h2>
        <p
          className="text-gray-300 text-lg leading-relaxed mt-2"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          {t("appAdvertisement.description")}
        </p>

        <div className="mt-6">
          <a
            href="https://play.google.com/store/apps/details?id=com.yh.gamingzone&hl=en"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center transition-all duration-300 hover:scale-105 active:scale-95 group"
          >
            <div className="bg-white px-6 py-3 rounded-xl flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] border border-transparent group-hover:border-white/30 transition-all">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="0.91em"
                height="1em"
                viewBox="0 0 256 283"
                className="w-8 h-8"
              >
                <path
                  fill="#ea4335"
                  d="M119.553 134.916L1.06 259.061a32.14 32.14 0 0 0 47.062 19.071l133.327-75.934z"
                />
                <path
                  fill="#fbbc04"
                  d="M239.37 113.814L181.715 80.79l-64.898 56.95l65.162 64.28l57.216-32.67a31.345 31.345 0 0 0 0-55.537z"
                />
                <path
                  fill="#4285f4"
                  d="M1.06 23.487A30.6 30.6 0 0 0 0 31.61v219.327a32.3 32.3 0 0 0 1.06 8.124l122.555-120.966z"
                />
                <path
                  fill="#34a853"
                  d="m120.436 141.274l61.278-60.483L48.564 4.503A32.85 32.85 0 0 0 32.051 0C17.644-.028 4.978 9.534 1.06 23.399z"
                />
              </svg>
              <div
                className={`flex flex-col ${locale === "ar" ? "items-end" : "items-start"}`}
                dir={locale === "ar" ? "rtl" : "ltr"}
              >
                <span className="text-[10px] text-gray-800 font-bold uppercase tracking-wider mb-[-2px]">
                  {t("appAdvertisement.getItOn")}
                </span>
                <span className="text-xl text-black font-black leading-none tracking-tight">
                  {t("appAdvertisement.googlePlay")}
                </span>
              </div>
            </div>
          </a>
        </div>
      </div>

      <div
        className={`relative z-10 hidden md:flex items-center justify-center w-48 h-48 md:w-64 md:h-64 mt-8 md:mt-0 opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-500 ${locale === "ar" ? "mr-8" : "ml-8"}`}
      >
        <Image
          src="/assets/icon.webp"
          alt="Gaming Zone App Icon"
          width={200}
          height={200}
          className="rounded-3xl shadow-2xl drop-shadow-[0_0_40px_rgba(30,136,229,0.4)]"
        />
      </div>
    </div>
  );
}
