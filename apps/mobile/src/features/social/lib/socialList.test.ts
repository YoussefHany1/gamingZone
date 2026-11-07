import { describe, expect, it } from "vitest";
import type { Conversation, FriendRequest, Friendship, ProfileSearchHit } from "@gaming-zone/core";
import type { ConversationUserState } from "../hooks/useConversationList";
import type { PlaySession } from "../hooks/usePlaySessions";
import {
  chatAdRow,
  countryOptions,
  relationByUid,
  selectSocialRows,
  sessionAdRow,
  socialTabCounts,
  toGroupFriends,
  visibleConversations,
  withListAds,
  withSessionAds,
  type SocialRowsInput,
} from "./socialList";

const uid = "me";

function friendship(id: string, other: string): Friendship {
  return {
    id,
    members: [uid, other],
    status: "active",
    createdAt: 1,
    endedAt: null,
  };
}

function request(id: string, from: string, to: string): FriendRequest {
  return {
    id,
    from,
    to,
    status: "pending",
    createdAt: 1,
    respondedAt: null,
  };
}

function conversation(
  id: string,
  overrides: Partial<Conversation> = {},
): Conversation {
  return {
    id,
    type: "dm",
    title: null,
    photoURL: null,
    members: [uid, "other"],
    admins: [],
    dmKey: "me_other",
    lastMessage: null,
    lastMessageAt: null,
    ...overrides,
  };
}

function hit(partial: Partial<ProfileSearchHit> & Pick<ProfileSearchHit, "uid">): ProfileSearchHit {
  return {
    handle: partial.uid,
    displayName: partial.uid,
    photoURL: null,
    platform: "PC",
    country: "US",
    ...partial,
  };
}

function playSession(id: string): PlaySession {
  return {
    id,
    conversationId: `conv-${id}`,
    participantUids: [uid, "other"],
    gameId: id,
    gameName: `Game ${id}`,
    status: "proposed",
    confirmedProposalId: null,
    startsAt: null,
    proposals: [],
  };
}

function state(partial: Partial<ConversationUserState>): ConversationUserState {
  return {
    lastReadAt: null,
    muted: false,
    archived: false,
    deletedAt: null,
    ...partial,
  };
}

function rows(partial: Partial<SocialRowsInput> = {}): SocialRowsInput {
  return {
    isSearching: false,
    results: [],
    platformFilter: null,
    countryFilter: null,
    segment: "friends",
    query: "",
    friendships: [],
    friendProfiles: {},
    uid,
    requestView: "incoming",
    sentRequests: [],
    requests: [],
    visibleConversations: [],
    ...partial,
  };
}

describe("visibleConversations", () => {
  const active = conversation("active", { lastMessageAt: 10 });
  const archived = conversation("archived", { lastMessageAt: 10 });
  const hidden = conversation("hidden", { lastMessageAt: 10 });
  const resurfaced = conversation("resurfaced", { lastMessageAt: 30 });
  const conversations = [active, archived, hidden, resurfaced];
  const settings = {
    archived: state({ archived: true }),
    hidden: state({ deletedAt: 20 }),
    resurfaced: state({ deletedAt: 20 }),
  };

  it("hides deleted conversations unless a newer message resurfaces them", () => {
    const visible = visibleConversations(conversations, settings, "active").map(
      (item) => item.id,
    );
    expect(visible).toEqual(["active", "resurfaced"]);
  });

  it("returns only archived conversations in the archived view", () => {
    const visible = visibleConversations(conversations, settings, "archived").map(
      (item) => item.id,
    );
    expect(visible).toEqual(["archived"]);
  });

  it("does not resurface a hidden conversation without a newer message", () => {
    const visible = visibleConversations(
      [conversation("stale", { lastMessageAt: 10 })],
      { stale: state({ deletedAt: 10 }) },
      "active",
    );
    expect(visible).toEqual([]);
  });
});

describe("selectSocialRows", () => {
  const friends = [friendship("f1", "ada"), friendship("f2", "bob")];
  const profiles = {
    ada: { displayName: "Ada Lovelace", handle: "ada" },
    bob: { displayName: "Bob", handle: "builder" },
  };

  it("filters friends by display name or handle when the query is non-empty", () => {
    const matched = selectSocialRows(
      rows({ segment: "friends", query: "  ADA ", friendships: friends, friendProfiles: profiles }),
    );
    expect(matched).toEqual([friends[0]]);
  });

  it("returns every friendship when the friend query is blank", () => {
    expect(
      selectSocialRows(rows({ segment: "friends", query: "   ", friendships: friends })),
    ).toBe(friends);
  });

  it("filters search hits by platform and country, case-insensitively", () => {
    const results = [
      hit({ uid: "a", platform: "PC", country: "US" }),
      hit({ uid: "b", platform: "playstation", country: "de" }),
      hit({ uid: "c", platform: "Xbox", country: "US" }),
    ];
    const matched = selectSocialRows(
      rows({
        isSearching: true,
        results,
        platformFilter: "PlayStation",
        countryFilter: "DE",
      }),
    );
    expect(matched).toEqual([results[1]]);
  });

  it("returns sent or incoming requests for the requests segment", () => {
    const incoming = [request("in", "ada", uid)];
    const sent = [request("out", uid, "bob")];
    expect(
      selectSocialRows(rows({ segment: "requests", requestView: "incoming", requests: incoming })),
    ).toBe(incoming);
    expect(
      selectSocialRows(
        rows({ segment: "requests", requestView: "sent", sentRequests: sent }),
      ),
    ).toBe(sent);
  });

  it("returns visible conversations for chats", () => {
    const chats = [conversation("c1")];
    expect(selectSocialRows(rows({ segment: "chats", visibleConversations: chats }))).toBe(
      chats,
    );
  });

  it("keeps returning friendships on the sessions segment", () => {
    expect(selectSocialRows(rows({ segment: "sessions", friendships: friends }))).toBe(
      friends,
    );
  });
});

describe("socialTabCounts", () => {
  it("counts incoming requests and unread conversation keys, not list lengths", () => {
    expect(
      socialTabCounts({
        friendships: [friendship("f", "ada")],
        requests: [request("in", "ada", uid)],
        unreadCounts: { c1: 1, c2: 1 },
        sessionsLength: 3,
      }),
    ).toEqual({ friends: 1, requests: 1, chats: 2, sessions: 3 });
  });
});

describe("toGroupFriends", () => {
  it("maps the other member and falls back to Player", () => {
    expect(
      toGroupFriends([friendship("f1", "ada"), friendship("f2", "bob")], {
        ada: { displayName: "Ada", photoURL: "ada.png" },
      }, uid),
    ).toEqual([
      { uid: "ada", displayName: "Ada", photoURL: "ada.png" },
      { uid: "bob", displayName: "Player", photoURL: null },
    ]);
  });
});

describe("relationByUid", () => {
  it("lets a friendship win over an incoming and a sent request", () => {
    const map = relationByUid(
      [friendship("f", "ada")],
      [request("in", "ada", uid)],
      [request("out", uid, "ada")],
      uid,
    );
    expect(map.get("ada")).toBe("friends");
  });

  it("lets an incoming request win over a sent request", () => {
    const map = relationByUid(
      [],
      [request("in", "ada", uid)],
      [request("out", uid, "ada")],
      uid,
    );
    expect(map.get("ada")).toBe("received");
  });

  it("records a sent-only request", () => {
    const map = relationByUid([], [], [request("out", uid, "ada")], uid);
    expect(map.get("ada")).toBe("sent");
  });

  it("omits a uid that appears in none of the lists", () => {
    const map = relationByUid([], [], [], uid);
    expect(map.has("ada")).toBe(false);
  });
});

describe("countryOptions", () => {
  it("keeps the first-seen order and drops empty countries", () => {
    expect(
      countryOptions([
        hit({ uid: "a", country: "US" }),
        hit({ uid: "b", country: "" }),
        hit({ uid: "c", country: "DE" }),
        hit({ uid: "d", country: "US" }),
      ]),
    ).toEqual(["US", "DE"]);
  });
});

describe("withListAds", () => {
  it("returns an empty list unchanged (the empty state owns that view)", () => {
    expect(withListAds([])).toEqual([]);
  });

  it("appends one trailing ad when there are fewer chats than the interval", () => {
    const rows = [conversation("c1"), conversation("c2"), conversation("c3")];
    expect(withListAds(rows)).toEqual([...rows, chatAdRow("ad-end")]);
  });

  it("splits 4 chats with an ad in the middle instead of trailing one", () => {
    const rows = [conversation("c1"), conversation("c2"), conversation("c3"), conversation("c4")];
    expect(withListAds(rows)).toEqual([
      conversation("c1"),
      conversation("c2"),
      conversation("c3"),
      conversation("c4"),
      chatAdRow("ad-4"),
    ]);
  });

  it("interleaves an ad after every interval chats", () => {
    const rows = Array.from({ length: 9 }, (_, index) => conversation(`c${index + 1}`));
    const result = withListAds(rows);
    expect(result.filter((row) => "chatAd" in row).map((row) => row.adId)).toEqual([
      "ad-4",
      "ad-8",
      "ad-end-3",
    ]);
    // 9 conversations + 3 ad slots.
    expect(result.length).toBe(12);
    // The conversations keep their order and stay unmodified.
    expect(result.filter((row) => "id" in row).map((row) => row.id)).toEqual(rows.map((row) => row.id));
  });

  it("adds no trailing ad when the count is an exact multiple of the interval", () => {
    const rows = Array.from({ length: 8 }, (_, index) => conversation(`c${index + 1}`));
    const ads = withListAds(rows).filter((row) => "chatAd" in row);
    expect(ads.map((row) => row.adId)).toEqual(["ad-4", "ad-8"]);
  });

  it("works unchanged for friendship rows (friends tab)", () => {
    const rows = [friendship("f1", "ada"), friendship("f2", "bob"), friendship("f3", "cyd")];
    expect(withListAds(rows)).toEqual([...rows, chatAdRow("ad-end")]);
  });

  it("works unchanged for friend-request rows (requests tab)", () => {
    const rows = [request("r1", "ada", uid), request("r2", uid, "bob"), request("r3", "cyd", uid)];
    expect(withListAds(rows)).toEqual([...rows, chatAdRow("ad-end")]);
  });
});

describe("withSessionAds", () => {
  it("returns an empty list ad-free", () => {
    expect(withSessionAds([] as PlaySession[])).toEqual([]);
  });

  it("marks chat slots and session slots with distinct flags", () => {
    expect(sessionAdRow("ad-end")).toEqual({ sessionAd: true, adId: "ad-end" });
    expect(chatAdRow("ad-end")).toEqual({ chatAd: true, adId: "ad-end" });
  });

  it("mirrors the chat rule: trailing ad for a 1–3 session list", () => {
    const rows = [playSession("s1"), playSession("s2"), playSession("s3")];
    expect(withSessionAds(rows)).toEqual([...rows, sessionAdRow("ad-end")]);
  });

  it("interleaves an ad after every interval sessions", () => {
    const rows = Array.from({ length: 6 }, (_, index) => playSession(`s${index + 1}`));
    const result = withSessionAds(rows);
    expect(result.filter((row) => "sessionAd" in row).map((row) => row.adId)).toEqual([
      "ad-4",
      "ad-end-2",
    ]);
    // The sessions keep their order and stay unmodified.
    expect(result.filter((row) => "sessionAd" in row === false).length).toBe(6);
  });
});
