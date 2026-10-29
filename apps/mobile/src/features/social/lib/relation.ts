/**
 * Relationship state for one profile.
 *
 * The public profile screen watches four canonical pair documents
 * (`friendships/{pair}`, the two directional `friendRequests/{id}` and
 * `blockedPairs/{pair}`) and folds them into the single action the bar shows.
 * Keeping the fold pure means the precedence rules are testable without a
 * Firestore listener.
 */
export type ProfileRelation = "friends" | "sent" | "received" | "blocked" | "none";

export type RelationState = {
  friendshipActive: boolean;
  requestSent: boolean;
  requestReceived: boolean;
  blocked: boolean;
};

/** No relationship at all — the state every listener starts from. */
export const emptyRelationState: RelationState = {
  friendshipActive: false,
  requestSent: false,
  requestReceived: false,
  blocked: false,
};

/**
 * Blocking wins over everything (the rules deny the profile read, so the bar
 * only offers "unblock"). An existing friendship wins over stale pending
 * requests, and an incoming request is shown as "accept" before an outgoing
 * one: crossed requests are auto-accepted by the backend, but until that lands
 * the actionable side is the safer default.
 */
export function deriveRelation(state: RelationState): ProfileRelation {
  if (state.blocked) return "blocked";
  if (state.friendshipActive) return "friends";
  if (state.requestReceived) return "received";
  if (state.requestSent) return "sent";
  return "none";
}
