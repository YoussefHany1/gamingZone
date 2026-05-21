"use client";

import React from "react";
import Link from "next/link";
import { MessageSquareCode } from "lucide-react";
import { useLangStore } from "../store/useLangStore";

export default function ChatBubble() {
  const { lang, t } = useLangStore();

  return (
    <div
      className={`fixed bottom-6 ${lang === "ar" ? "left-6" : "right-6"} z-40`}
    >
      <Link
        href="/chat"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-secondary-blue to-light-blue shadow-lg shadow-light-blue/30 border border-white/20 text-white hover:scale-110 active:scale-95 transition-all duration-300 group"
        title={t("aiChat.title")}
      >
        <MessageSquareCode className="w-7 h-7 animate-pulse group-hover:rotate-6 transition-transform duration-300" />
        <span className="absolute right-16 scale-0 group-hover:scale-100 bg-dark-bg/90 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-300 shadow-md">
          {t("aiChat.placeholder")}
        </span>
      </Link>
    </div>
  );
}
