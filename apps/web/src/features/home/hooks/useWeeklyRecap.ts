import { useState, useEffect } from "react";
import { databases } from "@/lib/appwrite";
import { Query } from "appwrite";
import { WeeklySummaryDoc } from "@/types";

export function useWeeklyRecap(initialSummary?: WeeklySummaryDoc | null) {
  const [summary, setSummary] = useState<WeeklySummaryDoc | null>(initialSummary || null);
  const [loading, setLoading] = useState(!initialSummary);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialSummary) return;
    async function fetchSummary() {
      try {
        const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
        const COLLECTION_ID = "weekly_summaries";

        if (!DATABASE_ID) return;

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_ID,
          [Query.orderDesc("$createdAt"), Query.limit(1)]
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
  }, [initialSummary]);

  return { summary, loading, expanded, setExpanded };
}
