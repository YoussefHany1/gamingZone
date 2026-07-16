"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-[#070b14] text-white font-sans p-6">
        <div className="bg-white/5 p-10 rounded-3xl max-w-lg w-full flex flex-col items-center gap-6 border border-white/10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              A critical error occurred
            </h1>
            <p className="text-gray-400 text-sm">
              We're sorry, but something went terribly wrong. Please try refreshing the page.
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="px-8 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-bold shadow-lg transition-colors active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
