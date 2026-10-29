"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Check, X, UserMinus } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";
import Link from "@/components/Link";
import { normalizeProfileSearch } from "@gaming-zone/core";
import {
  removeFriend,
  respondFriendRequest,
  searchProfiles,
  sendFriendRequest,
} from "../lib/socialApi";
import { useSocialRelations } from "../hooks/useSocialRelations";

export function SocialPageView() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { lang, t } = useLangStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<"friends" | "requests">("friends");
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof searchProfiles>>["results"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relations = useSocialRelations(user?.uid ?? "");

  useEffect(() => {
    if (!isLoading && (!user || user.isAnonymous))
      router.replace(`/${lang}/auth/login`);
  }, [isLoading, lang, router, user]);

  useEffect(() => {
    const normalized = normalizeProfileSearch(query);
    if (timer.current) clearTimeout(timer.current);
    if (normalized.length < 2) return;
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        setResults((await searchProfiles(normalized)).results ?? []);
      } catch {
        setError(t("social.errors.load"));
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, t]);

  if (isLoading || !user || user.isAnonymous)
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-400">
        {t("common.loading")}
      </main>
    );

  const action = async (operation: () => Promise<unknown>) => {
    try {
      setError("");
      await operation();
    } catch {
      setError(t("social.errors.load"));
    }
  };

  return (
    <main className="min-h-screen max-w-3xl mx-auto w-full px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">
          {t("social.friends.title")}
        </h1>
        <p className="text-gray-400 mt-2">{t("social.friends.empty")}</p>
      </div>
      <div className="flex gap-2">
        {(["friends", "requests"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setSegment(value)}
            className={`px-4 py-2 rounded-xl ${segment === value ? "bg-secondary-blue text-white" : "bg-white/5 text-gray-400"}`}
          >
            {t(`social.${value}.title`)}
            {value === "requests" && relations.requests.length > 0
              ? ` (${relations.requests.length})`
              : ""}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 glass-panel border border-white/10 rounded-2xl px-4 py-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("social.search.placeholder")}
          className="bg-transparent outline-none text-white flex-1"
        />
      </div>
      {error && <p className="text-red-300">{error}</p>}
      {loading && <p className="text-gray-400">{t("common.loading")}</p>}
      {query.trim().length >= 2 ? (
        !loading && results.length === 0 ? (
          <p className="text-gray-400">{t("social.search.noResults")}</p>
        ) : (
          <div className="space-y-3">
            {results.map((profile) => (
              <div
                key={profile.uid}
                className="glass-panel border border-white/10 rounded-2xl p-4 flex items-center gap-4"
              >
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary-blue flex items-center justify-center text-white font-bold">
                    {profile.displayName[0] ?? "P"}
                  </div>
                )}
                <Link href={`/u/${profile.handle}`} className="flex-1">
                  <span className="text-white font-semibold">
                    {profile.displayName}
                  </span>
                  <span className="block text-sm text-gray-400">
                    @{profile.handle}
                  </span>
                </Link>
                <button
                  onClick={() =>
                    void action(() => sendFriendRequest(profile.uid))
                  }
                  className="p-2 rounded-lg bg-secondary-blue text-white"
                  aria-label={t("social.actions.addFriend")}
                >
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : segment === "requests" ? (
        relations.requests.length === 0 ? (
          <p className="text-gray-400">{t("social.requests.empty")}</p>
        ) : (
          <div className="space-y-3">
            {relations.requests.map((request) => (
              <div
                key={request.id}
                className="glass-panel border border-white/10 rounded-2xl p-4 flex items-center gap-3"
              >
                <span className="text-white flex-1">@{request.from}</span>
                <button
                  onClick={() =>
                    void action(() =>
                      respondFriendRequest(request.from, "accept"),
                    )
                  }
                  className="p-2 rounded-lg bg-green-600 text-white"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    void action(() =>
                      respondFriendRequest(request.from, "decline"),
                    )
                  }
                  className="p-2 rounded-lg bg-red-600 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : relations.friends.length === 0 ? (
        <p className="text-gray-400">{t("social.friends.empty")}</p>
      ) : (
        <div className="space-y-3">
          {relations.friends.map((friend) => (
            <div
              key={friend.uid}
              className="glass-panel border border-white/10 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-secondary-blue flex items-center justify-center text-white font-bold">
                {friend.displayName[0] ?? "P"}
              </div>
              <Link href={`/u/${friend.handle}`} className="flex-1 text-white">
                {friend.displayName}
                <span className="block text-sm text-gray-400">
                  @{friend.handle}
                </span>
              </Link>
              <button
                onClick={() => void action(() => removeFriend(friend.uid))}
                className="p-2 rounded-lg bg-white/10 text-gray-300"
                aria-label={t("social.actions.removeFriend")}
              >
                <UserMinus className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
