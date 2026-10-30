"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { arrayUnion, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { Conversation, ProfileSearchHit, SocialMessage } from "@gaming-zone/core";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";
import { useSocialChats } from "../hooks/useSocialChats";
import { useChatProfiles } from "../hooks/useChatProfiles";
import { cancelSession, confirmSession, createPlaySession, leaveSession, proposeSlot, respondToSlot, sendSocialMessage, withdrawProposal } from "../lib/socialApi";
import { usePlaySessions } from "../hooks/usePlaySessions";

function displayTime(value: unknown): string {
  const date =
    typeof (value as { toDate?: unknown } | null)?.toDate === "function"
      ? (value as { toDate: () => Date }).toDate()
      : typeof value === "number"
        ? new Date(value)
        : null;
  return date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

export function SocialChatPanel({ profiles }: { profiles: ProfileSearchHit[] }) {
  const user = useAuthStore((state) => state.user);
  const t = useLangStore((state) => state.t);
  const uid = user?.uid ?? "";
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [sessionGameName, setSessionGameName] = useState("");
  const [sessionGameId, setSessionGameId] = useState<string | number>("");
  const [sessionStartsAt, setSessionStartsAt] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [minimumSessionStart] = useState(() => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));
  const [sessionBusy, setSessionBusy] = useState(false);
  const chats = useSocialChats(uid);
  const sessions = usePlaySessions(uid).filter((session) => session.conversationId === chats.selectedId && session.status !== "completed" && session.status !== "cancelled");

  const profileByUid = useMemo(
    () => Object.fromEntries(profiles.map((profile) => [profile.uid, profile])),
    [profiles],
  );

  const senderUids = useMemo(
    () =>
      Array.from(
        new Set(
          chats.messages
            .map((message) => message.senderId)
            .filter((senderId) => senderId && senderId !== uid && senderId !== "system"),
        ),
      ),
    [chats.messages, uid],
  );
  const senderProfiles = useChatProfiles(senderUids);

  useEffect(() => {
    if (!chats.selectedId || !uid) return;
    void setDoc(
      doc(db, "conversations", chats.selectedId, "reads", uid),
      { lastReadAt: serverTimestamp() },
      { merge: true },
    ).catch(() => undefined);
  }, [chats.selectedId, uid, chats.messages.length]);

  const otherProfile = (conversation: Conversation) => {
    const otherUid = conversation.members.find((member) => member !== uid);
    return otherUid ? profileByUid[otherUid] : undefined;
  };

  const scheduleSession = async () => {
    if (!chats.selectedId || !sessionGameName.trim() || !sessionStartsAt || sessionBusy) return;
    setSessionBusy(true);
    setSessionError("");
    try {
      const startsAt = new Date(sessionStartsAt).getTime();
      if (!Number.isFinite(startsAt) || startsAt <= Date.now()) throw new Error("invalid_time");
      const existing = sessions.find((session) => session.status === "proposed");
      const sessionId = existing?.id ?? (await createPlaySession({ conversationId: chats.selectedId, gameId: sessionGameId || sessionGameName.trim(), gameName: sessionGameName.trim() })).sessionId;
      await proposeSlot(sessionId, startsAt);
      setSessionGameName("");
      setSessionGameId("");
      setSessionStartsAt("");
    } catch {
      setSessionError(t("social.sessions.error"));
    } finally {
      setSessionBusy(false);
    }
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || !chats.selectedId || sending) return;
    setSending(true);
    setSendError(false);
    setText("");
    try {
      await sendSocialMessage(chats.selectedId, value);
    } catch {
      setSendError(true);
      setText(value);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="glass-panel border border-white/10 rounded-2xl overflow-hidden grid md:grid-cols-[260px_1fr] min-h-[520px]">
      <aside className="border-b md:border-b-0 md:border-r border-white/10 p-3">
        <h2 className="text-white font-semibold px-2 py-2 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> {t("social.chats.title")}
        </h2>
        <div className="space-y-1">
          {chats.conversations.map((conversation) => {
            const profile = otherProfile(conversation);
            return (
              <button
                key={conversation.id}
                onClick={() => chats.selectConversation(conversation.id)}
                className={`w-full text-left rounded-xl px-3 py-3 ${chats.selectedId === conversation.id ? "bg-secondary-blue/40" : "hover:bg-white/5"}`}
              >
                <span className="text-white block truncate">
                  {profile?.displayName ?? conversation.title ?? t("social.chats.conversation")}
                  {chats.unread[conversation.id] ? " •" : ""}
                </span>
                <span className="text-gray-400 text-sm block truncate">
                  {conversation.lastMessage?.text ?? t("social.chats.noMessages")}
                </span>
              </button>
            );
          })}
          {chats.conversations.length === 0 && (
            <p className="text-gray-400 text-sm px-2 py-3">{t("social.chats.empty")}</p>
          )}
        </div>
      </aside>

      <div className="flex flex-col min-h-[520px]">
        {!chats.selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 p-6 text-center">
            {t("social.chats.select")}
          </div>
        ) : (
          <>
            <header className="px-5 py-4 border-b border-white/10 text-white font-semibold">
              {otherProfile(chats.selectedConversation)?.displayName ??
                chats.selectedConversation.title ??
                t("social.chats.conversation")}
            </header>
            <div className="border-b border-white/10 p-3 space-y-2">
              <div className="flex gap-2">
                <input value={sessionGameName} onChange={(event) => setSessionGameName(event.target.value)} placeholder={t("social.sessions.gameName")} className="flex-1 rounded-lg bg-white/10 text-white px-3 py-2 outline-none" />
                <input value={sessionGameId} onChange={(event) => setSessionGameId(event.target.value)} placeholder={t("social.sessions.gameId")} className="w-28 rounded-lg bg-white/10 text-white px-3 py-2 outline-none" />
              </div>
              <div className="flex gap-2">
                <input type="datetime-local" value={sessionStartsAt} min={minimumSessionStart} onChange={(event) => setSessionStartsAt(event.target.value)} className="flex-1 rounded-lg bg-white/10 text-white px-3 py-2 outline-none" />
                <button onClick={() => void scheduleSession()} disabled={sessionBusy || !sessionGameName.trim() || !sessionStartsAt} className="rounded-lg bg-secondary-blue text-white px-3 py-2 disabled:opacity-50">{sessionBusy ? t("social.sessions.saving") : t("social.sessions.schedule")}</button>
              </div>
              {sessionError ? <p className="text-red-300 text-sm">{sessionError}</p> : null}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {chats.hasOlderMessages ? <button onClick={() => void chats.loadOlderMessages()} disabled={chats.loadingOlder} className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-gray-300">{chats.loadingOlder ? t("social.chats.loading") : t("social.chats.loadOlder")}</button> : null}
              {sessions.map((session) => {
                const proposal = session.proposals?.find((item) => item.status !== "withdrawn");
                const accepted = proposal?.responses[uid] === "accepted";
                const everyoneAccepted = proposal && session.participantUids.every((participant) => proposal.responses[participant] === "accepted");
                return (
                  <div key={session.id} className="rounded-xl border border-secondary-blue/40 bg-secondary-blue/10 p-3 text-white">
                    <p className="font-semibold">{session.gameName}</p>
                    <p className="text-sm text-gray-300">{session.status}{proposal ? ` • ${new Date(proposal.startsAt).toLocaleString()}` : ""}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {proposal && !accepted && session.status === "proposed" ? <button className="rounded-lg bg-secondary-blue px-3 py-1.5" onClick={() => void respondToSlot(session.id, proposal.id, "accepted")}>{t("social.sessions.accept")}</button> : null}
                      {proposal && accepted && session.status === "proposed" ? <button className="rounded-lg bg-red-700 px-3 py-1.5" onClick={() => void respondToSlot(session.id, proposal.id, "declined")}>{t("social.sessions.decline")}</button> : null}
                      {proposal && proposal.proposerUid === uid && session.status === "proposed" ? <button className="rounded-lg bg-white/10 px-3 py-1.5" onClick={() => void withdrawProposal(session.id, proposal.id)}>{t("social.sessions.withdraw")}</button> : null}
                      {proposal && everyoneAccepted && session.status === "proposed" ? <button className="rounded-lg bg-secondary-blue px-3 py-1.5" onClick={() => void confirmSession(session.id, proposal.id)}>{t("social.sessions.confirm")}</button> : null}
                      {session.status === "proposed" ? <button className="rounded-lg bg-white/10 px-3 py-1.5" onClick={() => void cancelSession(session.id)}>{t("social.sessions.cancel")}</button> : null}
                      <button className="rounded-lg bg-white/10 px-3 py-1.5" onClick={() => void leaveSession(session.id)}>{t("social.sessions.leave")}</button>
                    </div>
                  </div>
                );
              })}
              {[...chats.messages].reverse().map((message: SocialMessage) => {
                const own = message.senderId === uid;
                const removed = message.deletedFor?.includes(uid);
                const sender = senderProfiles[message.senderId] ?? profileByUid[message.senderId];
                const showAvatar = !own && message.senderId !== "system";
                return (
                  <div key={message.id} className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
                    {showAvatar ? (
                      sender?.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sender.photoURL}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-secondary-blue text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {sender?.displayName?.[0] ?? "P"}
                        </div>
                      )
                    ) : null}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${own ? "bg-secondary-blue text-white" : "bg-white/10 text-gray-100"}`}>
                      <p>{removed ? t("social.chats.removed") : message.text}</p>
                      {!removed && message.type === "game_suggestion" && message.gameName ? (
                        <a
                          href={`/games/${message.gameId ?? ""}`}
                          className="block mt-2 rounded-lg bg-black/20 px-3 py-2 font-semibold hover:bg-black/30"
                        >
                          🎮 {message.gameName}
                        </a>
                      ) : null}
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <span className="text-xs opacity-60">{displayTime(message.createdAt)}</span>
                        {!removed ? (
                          <button
                            onClick={() => {
                              if (!chats.selectedId) return;
                              void updateDoc(
                                doc(db, "conversations", chats.selectedId, "messages", message.id),
                                { deletedFor: arrayUnion(uid) },
                              );
                            }}
                            className="opacity-60 hover:opacity-100"
                            aria-label={t("social.chats.deleteForMe")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-white/10">
              {sendError && <p className="text-red-300 text-sm mb-2">{t("social.chats.unableSend")}</p>}
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder={t("social.chats.messagePlaceholder")}
                  className="flex-1 rounded-xl bg-white/10 text-white px-4 py-3 outline-none"
                />
                <button onClick={() => void submit()} disabled={sending} className="rounded-xl bg-secondary-blue text-white px-4" aria-label={t("social.chats.send")}>
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
