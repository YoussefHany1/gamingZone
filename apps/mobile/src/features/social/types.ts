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
  | PlaySession;

export type SocialRowsBySegment = Record<SocialSegment, SocialListRow[]>;
