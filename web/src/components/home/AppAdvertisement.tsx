"use client";

import Image from "next/image";
import { useLangStore } from "../../store/useLangStore";

export default function AppAdvertisement() {
  const { t, lang } = useLangStore();

  return (
    <div className="w-full rounded-2xl overflow-hidden relative my-12 bg-gradient-to-tr from-light-blue/20 to-secondary-blue/20 border border-white/10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 shadow-2xl">
      <div className="absolute inset-0 bg-dark-bg/40 z-0"></div>

      <div
        className={`relative z-10 flex flex-col items-center md:items-start text-center ${lang === "ar" ? "md:text-right" : "md:text-left"} gap-4 max-w-2xl mx-auto md:mx-0`}
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
          dir={lang === "ar" ? "rtl" : "ltr"}
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
              <svg viewBox="0 0 512 512" className="w-8 h-8">
                <path fill="#4CAF50" d="M32.8 44.8L256 256 32.8 467.2z" />
                <path fill="#2196F3" d="M32.8 44.8l323.5 178.6-100.3 32.6z" />
                <path
                  fill="#FFC107"
                  d="M356.3 223.4l117.8 65.1c11.2 6.2 11.2 22.8 0 29l-117.8 65.1-100.3-95.2z"
                />
                <path fill="#F44336" d="M32.8 467.2l323.5-178.6-100.3-32.6z" />
              </svg>
              <div
                className={`flex flex-col ${lang === "ar" ? "items-end" : "items-start"}`}
                dir={lang === "ar" ? "rtl" : "ltr"}
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
        className={`relative z-10 hidden md:flex items-center justify-center w-48 h-48 md:w-64 md:h-64 mt-8 md:mt-0 opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-500 ${lang === "ar" ? "mr-8" : "ml-8"}`}
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
