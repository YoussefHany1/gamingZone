import type {
  Conversation,
  FriendRequest,
  Friendship,
  ProfileSearchHit,
} from "@gaming-zone/core";
import type { PlaySession } from "./hooks/usePlaySessions";
import type { SocialSegment } from "./lib/socialList";

/** TabView route for one social segment (mirrors the news `RouteShape`). */
export type SocialRouteShape = {
  key: SocialSegment;
  title: string;
};

/** Any row a social list can render: search hits, friends, requests, chats or session cards. */
export type SocialListRow =
  | ProfileSearchHit
  | Friendship
  | FriendRequest
  | Conversation
  | PlaySession
  | ChatAdRow
  | SessionAdRow;

/** A native-ad placeholder interleaved in the chats list (`withChatAds`). */
export type ChatAdRow = {
  chatAd: true;
  /** Unique key per ad slot ("ad-4", "ad-end", …) for list key extraction. */
  adId: string;
};

/** A native-ad placeholder interleaved in the sessions list (`withSessionAds`). */
export type SessionAdRow = {
  sessionAd: true;
  /** Unique key per ad slot ("ad-4", "ad-end", …) for list key extraction. */
  adId: string;
};

export type SocialRowsBySegment = Record<SocialSegment, SocialListRow[]>;
