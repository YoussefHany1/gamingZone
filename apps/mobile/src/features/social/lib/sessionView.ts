/**
 * Pure session-card derivation shared by the social and chat screens.
 *
 * Both screens render the same proposal lifecycle (accept → confirm, decline,
 * withdraw, leave, cancel) with slightly different controls. Keeping the rules
 * here means the two cards cannot drift apart, and the permission matrix is
 * testable without a Firestore listener or a rendered component.
 */
import type { PlaySession } from "../hooks/usePlaySessions";

export type SessionVariant = "social" | "chat";
export type SessionProposal = PlaySession["proposals"][number];

export type SessionActionKind =
  "accept" | "decline" | "withdraw" | "confirm" | "leave" | "cancel";

export type SessionActions = Record<SessionActionKind, boolean>;

export type SessionView = {
  proposal: SessionProposal | undefined;
  /** The current user already accepted the active proposal. */
  accepted: boolean;
  /** Every participant accepted; the session can be confirmed. */
  everyoneAccepted: boolean;
  actions: SessionActions;
};

export const EMPTY_SESSION_ACTIONS: SessionActions = {
  accept: false,
  decline: false,
  withdraw: false,
  confirm: false,
  leave: false,
  cancel: false,
};

/** The proposal currently under discussion (withdrawn ones are ignored). */
export function activeProposal(session: PlaySession): SessionProposal | undefined {
  return session.proposals.find((proposal) => proposal.status !== "withdrawn");
}

export function sessionInitials(gameName: string): string {
  return gameName.trim().slice(0, 2).toUpperCase() || "GZ";
}

/**
 * `variant` only gates the lifecycle controls that genuinely differ between the
 * screens today:
 *  - social keeps "leave" visible until the session is cancelled, and only a
 *    participant can cancel an active (not completed) session;
 *  - chat always offers "leave" and offers "cancel" while the session is
 *    proposed.
 * The proposal actions themselves are identical.
 *
 * "confirm" is no longer a user action: the backend confirms a session in the
 * same transaction that records the final acceptance, so the field stays
 * false and the card UIs skip it.
 */
export function deriveSessionView(
  session: PlaySession,
  currentUid: string,
  variant: SessionVariant,
): SessionView {
  const proposal = activeProposal(session);
  const accepted = proposal?.responses[currentUid] === "accepted";
  const everyoneAccepted = Boolean(
    proposal &&
    session.participantUids.every(
      (participant) => proposal.responses[participant] === "accepted",
    ),
  );
  const proposed = session.status === "proposed";

  const actions: SessionActions = {
    accept: Boolean(proposal) && !accepted && proposed,
    decline: Boolean(proposal) && accepted && proposed,
    withdraw: Boolean(proposal) && proposal?.proposerUid === currentUid && proposed,
    // Auto-confirmed by the backend on the final acceptance.
    confirm: false,
    leave: variant === "chat" ? true : session.status !== "cancelled",
    cancel:
      variant === "chat"
        ? proposed
        : session.participantUids.includes(currentUid) &&
          session.status !== "cancelled" &&
          session.status !== "completed",
  };

  return { proposal, accepted, everyoneAccepted, actions };
}
