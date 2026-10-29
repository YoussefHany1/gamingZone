"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Check, X, UserMinus, UsersRound } from "lucide-react";
import { createGroupConversation } from "../lib/socialApi";
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
import { SocialChatPanel } from "./SocialChatPanel";
import { usePlaySessions } from "../hooks/usePlaySessions";
import { cancelSession, confirmSession, leaveSession, proposeSlot, respondToSlot, withdrawProposal } from "../lib/socialApi";

export function SocialPageView() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { lang, t } = useLangStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<"friends" | "requests" | "sessions">("friends");
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof searchProfiles>>["results"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relations = useSocialRelations(user?.uid ?? "");
  const sessions = usePlaySessions(user?.uid ?? "");

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

  const submitGroup = async () => {
    if (!groupTitle.trim() || selectedFriends.length === 0 || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const result = await createGroupConversation(groupTitle, selectedFriends);
      setGroupTitle("");
      setSelectedFriends([]);
      router.push(`/${lang}/social?conversation=${result.conversationId}`);
    } catch {
      setError(t("social.errors.chat"));
    } finally {
      setCreatingGroup(false);
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
        {(["friends", "requests", "sessions"] as const).map((value) => (
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
      {segment === "sessions" && !query.trim() ? (
        <div className="space-y-3">
          {sessions.length === 0 ? <p className="text-gray-400">No sessions yet</p> : sessions.map((session) => {
            const proposal = session.proposals?.[0];
            const accepted = proposal?.responses[user.uid] === "accepted";
            const everyoneAccepted = proposal && session.participantUids.every((participant) => proposal.responses[participant] === "accepted");
            return (
              <div key={session.id} className="glass-panel border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="flex-1"><p className="text-white font-semibold">{session.gameName}</p><p className="text-sm text-gray-400">{session.status}{proposal ? ` • ${new Date(proposal.startsAt).toLocaleString()}` : ""}</p></div>
                {proposal && !accepted && session.status === "proposed" ? <button className="rounded-lg bg-secondary-blue text-white px-3 py-2" onClick={() => void action(() => respondToSlot(session.id, proposal.id, "accepted"))}>Accept</button> : null}
                {proposal && accepted && session.status === "proposed" ? <button className="rounded-lg bg-red-700 text-white px-3 py-2" onClick={() => void action(() => respondToSlot(session.id, proposal.id, "declined"))}>Decline</button> : null}
                {proposal && proposal.proposerUid === user.uid && session.status === "proposed" ? <button className="rounded-lg bg-white/10 text-gray-200 px-3 py-2" onClick={() => void action(() => withdrawProposal(session.id, proposal.id))}>Withdraw</button> : null}
                {proposal && everyoneAccepted && session.status === "proposed" ? <button className="rounded-lg bg-secondary-blue text-white px-3 py-2" onClick={() => void action(() => confirmSession(session.id, proposal.id))}>Confirm</button> : null}
                {session.status === "proposed" ? <button className="rounded-lg bg-white/10 text-gray-200 px-3 py-2" onClick={() => void action(() => cancelSession(session.id))}>Cancel</button> : null}
                {session.status !== "cancelled" ? <button className="rounded-lg bg-white/10 text-gray-200 px-3 py-2" onClick={() => void action(() => leaveSession(session.id))}>Leave</button> : null}
              </div>
            );
          })}
        </div>
      ) : !query.trim() && (
        <div className="glass-panel border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <UsersRound className="w-5 h-5" /> Create group
          </h2>
          <input
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            placeholder="Group name"
            className="w-full rounded-xl bg-white/10 text-white px-4 py-3 outline-none"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            {relations.friends.map((friend) => {
              const selected = selectedFriends.includes(friend.uid);
              return (
                <button
                  key={friend.uid}
                  onClick={() => setSelectedFriends((previous) => selected
                    ? previous.filter((item) => item !== friend.uid)
                    : [...previous, friend.uid])}
                  className={`text-left rounded-xl px-3 py-2 ${selected ? "bg-secondary-blue text-white" : "bg-white/5 text-gray-300"}`}
                >
                  {friend.displayName}
                  <span className="block text-xs opacity-70">@{friend.handle}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => void submitGroup()}
            disabled={creatingGroup || !groupTitle.trim() || selectedFriends.length === 0}
            className="rounded-xl bg-secondary-blue text-white px-4 py-2 disabled:opacity-50"
          >
            {creatingGroup ? "Creating…" : "Create group"}
          </button>
        </div>
      )}
      {!query.trim() && <SocialChatPanel profiles={relations.friends} />}
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
