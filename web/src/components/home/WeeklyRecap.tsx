"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLangStore } from "../../store/useLangStore";
import { databases } from "../../lib/appwrite";
import { Query } from "appwrite";
import { Calendar, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface WeeklySummaryDoc {
  $id: string;
  $createdAt: string;
  summary_ar?: string;
  summary_en?: string;
}

export default function WeeklyRecap() {
  const { lang, t } = useLangStore();
  const [summary, setSummary] = useState<WeeklySummaryDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
        const COLLECTION_ID = "weekly_summaries";

        if (!DATABASE_ID) return;

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_ID,
          [Query.orderDesc("$createdAt"), Query.limit(1)],
        );

        if (response.documents.length > 0) {
          setSummary(response.documents[0] as unknown as WeeklySummaryDoc);
        }
      } catch (error) {
        console.error("Error fetching weekly summary:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="mx-4 md:mx-0 my-8 p-6 rounded-2xl glass-panel animate-pulse flex flex-col gap-4">
        <div className="h-6 bg-white/10 w-1/4 rounded-md"></div>
        <div className="h-20 bg-white/5 rounded-md"></div>
      </div>
    );
  }

  if (!summary) return null;

  const content = lang === "ar" ? summary.summary_ar : summary.summary_en;
  if (!content) return null;

  const formattedDate = new Date(summary.$createdAt).toLocaleDateString(
    lang === "ar" ? "ar-EG" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <section className="mx-4 md:mx-0 my-10 p-6 rounded-2xl glass-panel border border-white/10 shadow-lg relative overflow-hidden transition-all duration-300">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-light-blue/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-light-blue to-secondary-blue rounded-xl text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-light-blue bg-clip-text text-transparent">
              {t("home.seeklySummary.title")}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {t("home.seeklySummary.createdBy")} Gemini 2.5 Flash
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-4 h-4 text-light-blue" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Content */}
      <div
        className={`prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed transition-all duration-500 overflow-hidden ${
          expanded ? "max-h-[5000px]" : "max-h-24 relative"
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>

        {!expanded && (
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-dark-bg/90 to-transparent pointer-events-none"></div>
        )}
      </div>

      {/* Read More button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-3 mt-4 border-t border-white/5 text-sm font-semibold text-light-blue hover:text-white transition-colors duration-300"
      >
        <span>
          {expanded
            ? t("home.seeklySummary.readLess")
            : t("home.seeklySummary.readMore")}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
    </section>
  );
}
